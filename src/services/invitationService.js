const Invitation = require("../models/invitation");
const { getEmailService } = require("./email.service");
const { AppError } = require("../errors/AppError");

/**
 * Create invitation with email sending
 */
async function createInvitation(email, role, createdBy, organization) {
  try {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(400, "Invalid email format");
    }

    // Check if invitation already exists
    const existingInvitation = await Invitation.findOne({
      email,
      organization,
      used: false,
    });

    if (existingInvitation) {
      throw new AppError(400, "Invitation already exists for this email");
    }

    // Generate token
    const token = require("crypto").randomBytes(32).toString("hex");

    // Create invitation
    const invitation = new Invitation({
      email,
      role,
      token,
      createdBy,
      organization,
      used: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await invitation.save();

    // Send email
    const emailService = getEmailService();
    try {
      await emailService.sendInvitationEmail(email, token, role);
      console.log(`✅ Invitation created and email sent to ${email}`);
    } catch (emailError) {
      // If email fails, delete the invitation
      await Invitation.findByIdAndDelete(invitation._id);
      console.error(
        `❌ Email failed, invitation deleted:`,
        emailError.message
      );
      throw new Error(
        `Failed to send invitation email: ${emailError.message}`
      );
    }

    return invitation;
  } catch (error) {
    console.error("❌ Error creating invitation:", error.message);
    throw error;
  }
}

/**
 * Get invitations by creator
 */
async function getInvitationsByCreator(createdBy, filters = {}) {
  try {
    const query = { createdBy };

    if (filters.used !== undefined) {
      query.used = filters.used;
    }

    if (filters.pending === true) {
      query.used = false;
      query.expiresAt = { $gt: new Date() };
    }

    const invitations = await Invitation.find(query).sort({ createdAt: -1 });

    return invitations;
  } catch (error) {
    console.error("❌ Error fetching invitations:", error.message);
    throw error;
  }
}

/**
 * Get invitation by token
 */
async function getInvitationByToken(token) {
  try {
    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      throw new AppError(404, "Invitation not found");
    }

    // Check if expired (before checking used, so expired+used shows the right message)
    if (!invitation.used && new Date() > invitation.expiresAt) {
      throw new AppError(410, "Invitation has expired");
    }

    // Check if already used
    if (invitation.used) {
      throw new AppError(400, "Invitation has already been used");
    }

    return invitation;
  } catch (error) {
    console.error("❌ Error fetching invitation:", error.message);
    throw error;
  }
}

/**
 * Mark invitation as used
 */
async function markInvitationAsUsed(token) {
  try {
    const invitation = await Invitation.findOneAndUpdate(
      { token },
      { used: true, usedAt: new Date() },
      { new: true }
    );

    if (!invitation) {
      throw new AppError(404, "Invitation not found");
    }

    return invitation;
  } catch (error) {
    console.error("❌ Error marking invitation as used:", error.message);
    throw error;
  }
}

module.exports = {
  createInvitation,
  getInvitationsByCreator,
  getInvitationByToken,
  markInvitationAsUsed,
};