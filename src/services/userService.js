const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/user");
const Invitation = require("../models/invitation");
const { AppError } = require("../errors/AppError");

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

async function register(body) {
  const { name, email, password, token, companyName } = body;

  if (!name || !email || !password) {
    throw new AppError(400, "Missing required fields");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError(409, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  let role;
  let organization;

  // 🔵 REGISTRO CON INVITACIÓN
  if (token) {
    const invitation = await Invitation.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!invitation) {
      throw new AppError(400, "Invalid invitation");
    }

    if (invitation.email !== normalizedEmail) {
      throw new AppError(400, "Email does not match invitation");
    }

    role = invitation.role;
    organization = invitation.organization;

    user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      organization
    });

    invitation.used = true;
    await invitation.save();

  } else {
    // 🔴 REGISTRO ADMIN (PRIMER USUARIO)
    if (!companyName) {
      throw new AppError(400, "Company name required");
    }

    const userId = new mongoose.Types.ObjectId();

    user = await User.create({
      _id: userId,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
      organization: userId // 🔥 el admin ES la organización
    });
  }

  const jwtToken = jwt.sign(
    { userId: user._id.toString() },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token: jwtToken,
    user
  };
}

async function login(body) {
  const { email, password } = body;

  if (!email || !password) {
    throw new AppError(400, "Missing credentials");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError(401, "Invalid credentials");
  }

  const token = jwt.sign(
    { userId: user._id.toString() },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user
  };
}

module.exports = { register, login };