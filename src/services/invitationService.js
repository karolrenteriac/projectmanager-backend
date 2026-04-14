const crypto = require("crypto");
const Invitation = require("../models/invitation");
const User = require("../models/user");
const { AppError } = require("../errors/AppError");
const { 
  toInvitationDTO, 
  toInvitationSummaryDTO, 
  toInvitationCreateResponseDTO 
} = require("../dtos/invitationDto");
const { 
  VALID_INVITATION_ROLES, 
  INVITATION_EXPIRY_HOURS 
} = require("../constants");
const { sendInvitationEmail } = require("./email.service");


function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createInvitation(email, role, createdBy, organization = null) {
  if (!email || !role || !createdBy) {
    throw new AppError(400, "Email, role, and createdBy are required.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!VALID_INVITATION_ROLES.includes(role)) {
    throw new AppError(400, `Role must be one of: ${VALID_INVITATION_ROLES.join(", ")}.`);
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError(409, "A user with this email already exists.");
  }

  const existingInvitation = await Invitation.findOne({
    email: normalizedEmail,
    used: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (existingInvitation) {
    throw new AppError(409, "An active invitation already exists for this email.");
  }

  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITATION_EXPIRY_HOURS);

  const invitation = await Invitation.create({
    email: normalizedEmail,
    role,
    token,
    organization,
    expiresAt,
    createdBy,
  });

  // Send invitation email — failure is logged but must not break invitation creation
  try {
    await sendInvitationEmail(normalizedEmail, invitation.token, role);
  } catch (emailErr) {
    console.error("❌ Failed to send invitation email (non-critical):", emailErr.message);
  }

  return toInvitationCreateResponseDTO({
    id: invitation._id,
    token: invitation.token,
    invitationLink: `${process.env.FRONTEND_URL || "http://localhost:4200"}/auth/register?token=${invitation.token}`,
    expiresAt: invitation.expiresAt,
  });
}

async function getInvitationByToken(token) {
  if (!token) {
    throw new AppError(400, "Token is required.");
  }

  const invitation = await Invitation.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() }
  }).populate('createdBy', 'name email');

  if (!invitation) {
    throw new AppError(404, "Invalid or expired invitation.");
  }

  return toInvitationDTO(invitation);
}

async function markInvitationAsUsed(token, userEmail) {
  const invitation = await Invitation.findOne({ token });
  
  if (!invitation) {
    throw new AppError(404, "Invitation not found.");
  }

  if (invitation.used) {
    throw new AppError(400, "Invitation has already been used.");
  }

  if (invitation.email !== userEmail) {
    throw new AppError(400, "Email does not match invitation email.");
  }

  invitation.used = true;
  await invitation.save();

  return invitation;
}

async function getInvitationsByCreator(createdBy, filters = {}) {
  const { used, pending } = filters;
  
  let query = { createdBy };
  
  if (used !== undefined) {
    query.used = used;
  }
  
  if (pending === true) {
    query.used = false;
    query.expiresAt = { $gt: new Date() };
  }

  const invitations = await Invitation.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  return invitations.map(inv => toInvitationSummaryDTO(inv));
}

module.exports = {
  createInvitation,
  getInvitationByToken,
  markInvitationAsUsed,
  getInvitationsByCreator,
};
