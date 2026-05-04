const crypto = require("crypto");
const Invitation = require("../models/invitation");
const User = require("../models/user");
const { AppError } = require("../errors/AppError");
const { sendInvitationEmail } = require("./email.service");

function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex");
}

// 🔥 CREAR INVITACIÓN
async function createInvitation(email, role, createdBy) {
  if (!email || !role || !createdBy) {
    throw new AppError(400, "Missing required fields");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError(409, "User already exists");
  }

  const existingInvitation = await Invitation.findOne({
    email: normalizedEmail,
    used: false,
    expiresAt: { $gt: new Date() }
  });

  if (existingInvitation) {
    throw new AppError(409, "Invitation already exists");
  }

  const creator = await User.findById(createdBy);
  if (!creator || !creator.organization) {
    throw new AppError(400, "Creator has no organization");
  }

  const token = generateSecureToken();

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const invitation = await Invitation.create({
    email: normalizedEmail,
    role,
    token,
    organization: creator.organization, // 🔥 CLAVE
    createdBy,
    expiresAt
  });

  await sendInvitationEmail(normalizedEmail, token, role);

  return invitation;
}

// 🔥 OBTENER INVITACIÓN POR TOKEN
async function getInvitationByToken(token) {
  const invitation = await Invitation.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() }
  });

  if (!invitation) {
    throw new AppError(404, "Invalid invitation");
  }

  return invitation;
}

// 🔥 OBTENER INVITACIONES DEL ADMIN (ESTA ES LA QUE FALTABA)
async function getInvitationsByCreator(createdBy) {
  const invitations = await Invitation.find({
    createdBy
  }).sort({ createdAt: -1 });

  return invitations;
}

// 🔥 MARCAR COMO USADA
async function markInvitationAsUsed(token) {
  const invitation = await Invitation.findOne({ token });

  if (!invitation) {
    throw new AppError(404, "Invitation not found");
  }

  invitation.used = true;
  await invitation.save();

  return invitation;
}

module.exports = {
  createInvitation,
  getInvitationByToken,
  getInvitationsByCreator, // 🔥 ESTA FALTABA
  markInvitationAsUsed
};