const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Invitation = require("../models/invitation");
const { AppError } = require("../errors/AppError");
const { toUserDTO } = require("../dtos/userDto");
const {
  VALID_REGISTER_ROLES_WITHOUT_INVITATION,
  VALID_REGISTER_ROLES_WITH_INVITATION,
  USER_ROLES
} = require("../constants");

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

async function register(body) {
  const { name, email, password, token, companyName } = body || {};

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

  const hashedPassword = await bcrypt.hash(String(password), SALT_ROUNDS);

  let userRole;
  let organization;

  if (token) {
    // ──────────────────────────────────────────────
    // INVITED USER FLOW
    // ──────────────────────────────────────────────
    const invitation = await Invitation.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!invitation) {
      throw new AppError(400, "Invalid or expired invitation token.");
    }

    if (invitation.email !== normalizedEmail) {
      throw new AppError(400, "Email does not match invitation email.");
    }

    userRole = invitation.role;
    organization = invitation.organization;

    if (!organization) {
      // Fallback: use the invitation creator's organization
      const creator = await User.findById(invitation.createdBy);
      if (creator && creator.organization) {
        organization = creator.organization;
      } else {
        throw new AppError(400, "Invitation has no valid organization.");
      }
    }

    // Create user with organization from invitation
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
      organization: organization,
    });

    // Mark invitation as used
    invitation.used = true;
    await invitation.save();

    // Generate JWT
    if (!JWT_SECRET) {
      throw new AppError(500, "Server configuration error");
    }

    const jwtToken = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return { token: jwtToken, user: toUserDTO(user) };

  } else {
    // ──────────────────────────────────────────────
    // ADMIN SELF-REGISTRATION FLOW
    // ──────────────────────────────────────────────
    if (!companyName || String(companyName).trim() === "") {
      throw new AppError(400, "Company name is required for admin registration.");
    }

    userRole = USER_ROLES.ADMIN;

    // Create admin user first with a placeholder organization (self-reference)
    // We use a new ObjectId that we'll assign as the user's _id
    const mongoose = require("mongoose");
    const userId = new mongoose.Types.ObjectId();

    const user = await User.create({
      _id: userId,
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
      organization: userId, // Admin IS the organization anchor
    });

    // Generate JWT
    if (!JWT_SECRET) {
      throw new AppError(500, "Server configuration error");
    }

    const jwtToken = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return { token: jwtToken, user: toUserDTO(user) };
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

  if (user.isDeleted) {
    throw new AppError(401, "Account has been deactivated.");
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
