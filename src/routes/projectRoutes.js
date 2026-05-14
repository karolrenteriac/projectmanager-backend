const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  softDeleteProject,
  exportProject,
} = require("../controllers/projectController");

const router = express.Router();

// All project routes require authentication
router.use(protect);

// ── Project Visibility (role-based filtering inside service) ───────────────
router.get("/", getProjects);
router.get("/:id", getProjectById);

// ── Export (admin + coordinator only — enforced in service) ────────────────
router.get("/:id/export", exportProject);

// ── Admin-only mutations ───────────────────────────────────────────────────
router.post(   "/",    strictRoleMiddleware(["admin"]), createProject);
router.put(    "/:id", strictRoleMiddleware(["admin"]), updateProject);
router.delete( "/:id", strictRoleMiddleware(["admin"]), softDeleteProject);

module.exports = router;
