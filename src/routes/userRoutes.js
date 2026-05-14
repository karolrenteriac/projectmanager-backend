const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const { getUsers } = require("../controllers/userController");
const {
  getUsers:          adminGetUsers,
  getUserById:       adminGetUserById,
  updateUserRole:    adminUpdateUserRole,
  updateUserStatus:  adminUpdateUserStatus,
} = require("../controllers/adminUserController");

// Existing route — returns org member list for dropdowns
router.get("/", protect, getUsers);

// ── Admin-only User Management ─────────────────────────────────────────────
// /admin/list must be registered BEFORE /admin/:id to avoid "list" matching :id
router.get(   "/admin/list",       protect, strictRoleMiddleware(["admin"]), adminGetUsers);
router.get(   "/admin/:id",        protect, strictRoleMiddleware(["admin"]), adminGetUserById);
router.patch( "/admin/:id/role",   protect, strictRoleMiddleware(["admin"]), adminUpdateUserRole);
router.patch( "/admin/:id/status", protect, strictRoleMiddleware(["admin"]), adminUpdateUserStatus);

module.exports = router;
