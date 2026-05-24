const express = require("express");
const {
  createInvitation,
  getInvitations,
  getInvitationByToken,
  verifySMTP,
} = require("../controllers/invitationController");
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * POST /api/invitations
 * Create a new invitation (Admin only)
 * Required: email, role
 */
router.post("/", protect, roleMiddleware(["admin"]), createInvitation);

/**
 * GET /api/invitations
 * Get invitations created by the authenticated user (Admin only)
 * Query params: used=true/false, pending=true
 */
router.get("/", protect, roleMiddleware(["admin"]), getInvitations);

/**
 * GET /api/invitations/verify-smtp/status
 * Verify SMTP connection (debugging - should be protected in production)
 */
router.get("/verify-smtp/status", verifySMTP);

/**
 * GET /api/invitations/:token
 * Get invitation details by token (Public - no auth required)
 * Used on the registration page
 */
router.get("/:token", getInvitationByToken);

module.exports = router;