const invitationService = require("../services/invitationService");
const { handleError } = require("../utils/handleError");
const { toInvitationCreateResponseDTO } = require("../dtos/invitationDto");
const { getEmailService } = require("../services/email.service");

/**
 * POST /api/invitations
 * Create a new invitation and send email
 */
const createInvitation = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const createdBy = req.user.userId;
    const organization = req.user.organization || req.body.organization;

    // Validate required fields
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: "email and role are required",
      });
    }

    // Create invitation (includes email sending)
    const result = await invitationService.createInvitation(
      email,
      role,
      createdBy,
      organization
    );

    return res.status(201).json({
      success: true,
      message: "Invitation created and email sent successfully.",
      data: toInvitationCreateResponseDTO(result),
    });
  } catch (err) {
    console.error("❌ Error creating invitation:", err.message);
    handleError(err, res, next);
  }
};

/**
 * GET /api/invitations
 * Get invitations created by the authenticated user
 */
const getInvitations = async (req, res, next) => {
  try {
    const createdBy = req.user.userId;
    const { used, pending } = req.query;

    const filters = {};
    if (used !== undefined) {
      filters.used = used === "true";
    }
    if (pending === "true") {
      filters.pending = true;
    }

    const invitations = await invitationService.getInvitationsByCreator(
      createdBy,
      filters
    );

    return res.json({
      success: true,
      data: invitations,
    });
  } catch (err) {
    console.error("❌ Error fetching invitations:", err.message);
    handleError(err, res, next);
  }
};

/**
 * GET /api/invitations/:token
 * Get invitation details by token (public endpoint)
 */
const getInvitationByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invitation = await invitationService.getInvitationByToken(token);

    return res.json({
      success: true,
      data: invitation,
    });
  } catch (err) {
    console.error("❌ Error fetching invitation by token:", err.message);
    handleError(err, res, next);
  }
};

/**
 * GET /api/invitations/verify-smtp/status
 * Verify SMTP connection (debugging endpoint)
 */
const verifySMTP = async (req, res, next) => {
  try {
    const emailService = getEmailService();
    const result = await emailService.verifyConnection();

    const statusCode = result.success ? 200 : 500;
    return res.status(statusCode).json(result);
  } catch (err) {
    console.error("❌ Error verifying SMTP:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error verifying SMTP connection",
      error: err.message,
    });
  }
};

module.exports = {
  createInvitation,
  getInvitations,
  getInvitationByToken,
  verifySMTP,
};