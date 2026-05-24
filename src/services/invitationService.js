const Invitation = require("../models/invitation");
const { getEmailService } = require("./email.service");

/**
 * Create invitation with email sending
 */
async function createInvitation(email, role, createdBy, organization) {
  try {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Invalid email format");
      error.status = 400;
      throw error;
    }

    // Check if invitation already exists
    const existingInvitation = await Invitation.findOne({
      email,
      organization,
      used: false,
    });

    if (existingInvitation) {
      const error = new Error("Invitation already exists for this email");
      error.status = 400;
      throw error;
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
      const error = new Error("Invitation not found");
      error.status = 404;
      throw error;
    }

    // Check if expired
    if (new Date() > invitation.expiresAt && !invitation.used) {
      const error = new Error("Invitation has expired");
      error.status = 410;
      throw error;
    }

    // Check if already used
    if (invitation.used) {
      const error = new Error("Invitation has already been used");
      error.status = 400;
      throw error;
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
      const error = new Error("Invitation not found");
      error.status = 404;
      throw error;
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