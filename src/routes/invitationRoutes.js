const express = require("express");
const { createInvitation, getInvitations, getInvitationByToken } = require("../controllers/invitationController");
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// POST /api/invitations - Create a new invitation (Admin only)
router.post("/", protect, roleMiddleware(["admin"]), createInvitation);

// GET /api/invitations - Get invitations created by the user (Admin only)
router.get("/", protect, roleMiddleware(["admin"]), getInvitations);

// GET /api/invitations/:token - Get invitation details by token (Public)
router.get("/:token", getInvitationByToken);

module.exports = router;
