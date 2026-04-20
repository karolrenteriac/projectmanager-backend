const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} = require("../controllers/taskController");

/**
 * ROUTES FOR /api/tasks
 * All routes are protected by JWT authentication
 */

// POST /api/tasks - Create a new task
router.post("/", protect, createTask);

// GET /api/tasks?projectId=XXX - Get tasks for a specific project
router.get("/", protect, getTasks);

// GET /api/tasks/:id - Get a single task by ID
router.get("/:id", protect, getTaskById);

// PUT /api/tasks/:id - Update task status/details
router.put("/:id", protect, updateTask);

// DELETE /api/tasks/:id - Soft delete a task
router.delete("/:id", protect, deleteTask);

module.exports = router;