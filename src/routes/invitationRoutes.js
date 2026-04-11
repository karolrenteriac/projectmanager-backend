const express = require("express");
const { createInvitation, getInvitations, getInvitationByToken } = require("../controllers/invitationController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware(["admin"]), createInvitation);

router.get("/", authMiddleware, roleMiddleware(["admin"]), getInvitations);

router.get("/:token", getInvitationByToken);

module.exports = router;
