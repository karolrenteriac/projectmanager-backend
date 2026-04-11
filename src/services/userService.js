const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { AppError } = require("../errors/AppError");
const { toUserDTO } = require("../dtos/userDto");
const invitationService = require("./invitationService");
const { 
  VALID_REGISTER_ROLES_WITHOUT_INVITATION,
  VALID_REGISTER_ROLES_WITH_INVITATION,
  USER_ROLES
} = require("../constants");

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

async function register(body) {
  const { name, email, password, role, token } = body || {};

  if (
    name === undefined ||
    email === undefined ||
    password === undefined ||
    String(name).trim() === "" ||
    String(email).trim() === "" ||
    String(password) === ""
  ) {
    throw new AppError(400, "Name, email, and password are required.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError(409, "User already exists with this email.");
  }

  let userRole = role;
  let organization = null;

  if (token) {
    const invitation = await invitationService.getInvitationByToken(token);
    
    if (invitation.email !== normalizedEmail) {
      throw new AppError(400, "Email does not match invitation email.");
    }

    userRole = invitation.role;
    organization = invitation.organization;

    await invitationService.markInvitationAsUsed(token, normalizedEmail);
  } else {
    if (userRole && !VALID_REGISTER_ROLES_WITHOUT_INVITATION.includes(userRole)) {
      throw new AppError(400, `Only ${VALID_REGISTER_ROLES_WITHOUT_INVITATION.join(' or ')} role is allowed for registration without invitation.`);
    }
    userRole = USER_ROLES.ADMIN;
  }

  const hashedPassword = await bcrypt.hash(String(password), SALT_ROUNDS);

  try {
    await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
      ...(organization && { organization }),
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(409, "User already exists with this email.");
    }
    throw err;
  }
}

async function login(body) {
  const { email, password } = body || {};

  if (
    email === undefined ||
    password === undefined ||
    String(email).trim() === "" ||
    String(password) === ""
  ) {
    throw new AppError(400, "Email and password are required.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AppError(401, "Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(String(password), user.password);
  if (!isMatch) {
    throw new AppError(401, "Invalid email or password.");
  }

  if (!JWT_SECRET) {
    throw new AppError(500, "Server configuration error");
  }

  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return { token, user: toUserDTO(user) };
}

module.exports = { register, login };
