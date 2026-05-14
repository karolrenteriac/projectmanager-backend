const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const { uploadEvidence: evidenceMiddleware } = require("../middleware/upload");
const {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  updateTaskStatus,
  submitForReview,
  reviewTask,
  addComment,
  deleteTask,
  uploadEvidence,
  deleteEvidence,
} = require("../controllers/taskController");

const router = express.Router();

// All task routes require authentication
router.use(protect);

// ── Read (all authenticated roles with project access) ─────────────────────
router.get("/project/:projectId", getTasksByProject);
router.get("/:id",                getTaskById);

// ── Coordinator-only task management ──────────────────────────────────────
router.post(   "/",           strictRoleMiddleware(["coordinator"]), createTask);
router.put(    "/:id",        updateTask);          // Role enforced in service (coordinator full-edit; workers checklist-only)
router.patch(  "/:id/status", updateTaskStatus);    // Role enforced in service (coordinator any; workers todo→in-progress only)
router.delete( "/:id",        strictRoleMiddleware(["coordinator"]), deleteTask);
router.patch(  "/:id/review", strictRoleMiddleware(["coordinator"]), reviewTask);

// ── Worker-only workflow ───────────────────────────────────────────────────
router.patch("/:id/submit", strictRoleMiddleware(["principal", "co-researcher"]), submitForReview);

// ── Comments (coordinator + workers; admin blocked in service) ─────────────
router.post("/:id/comments", addComment);

// ── Evidence — upload (workers only) and delete (workers + coordinator) ────
router.post("/:id/evidence",
  strictRoleMiddleware(["principal", "co-researcher"]),
  (req, res, next) => {
    evidenceMiddleware(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  uploadEvidence
);

router.delete("/:id/evidence/:evidenceId", deleteEvidence);

module.exports = router;
