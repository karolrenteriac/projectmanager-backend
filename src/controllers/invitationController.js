const invitationService = require("../services/invitationService");
const { handleError } = require("../utils/handleError");
const { toInvitationCreateResponseDTO } = require("../dtos/invitationDto");

const createInvitation = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const createdBy = req.user.userId;

    // CRITICAL FIX: Always use the authenticated user's organization
    // instead of relying on the request body (which may be empty)
    const organization = req.user.organization || req.body.organization;

    const result = await invitationService.createInvitation(
      email,
      role,
      createdBy,
      organization
    );

    return res.status(201).json({
      success: true,
      message: "Invitation created successfully.",
      data: toInvitationCreateResponseDTO(result),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getInvitations = async (req, res, next) => {
  try {
    const createdBy = req.user.userId;
    const { used, pending } = req.query;

    const filters = {};
    if (used !== undefined) {
      filters.used = used === 'true';
    }
    if (pending === 'true') {
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
    handleError(err, res, next);
  }
};

const getInvitationByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invitation = await invitationService.getInvitationByToken(token);

    return res.json({
      success: true,
      data: invitation,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  createInvitation,
  getInvitations,
  getInvitationByToken,
};
