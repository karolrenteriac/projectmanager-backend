const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createTask,
  getTasksByProject,
  updateTaskStatus,
  softDeleteTask,
} = require("../controllers/taskController");

const router = express.Router();

router.post("/", authMiddleware, createTask);
router.get("/project/:projectId", authMiddleware, getTasksByProject);
router.put("/:id", authMiddleware, updateTaskStatus);
router.delete("/:id", authMiddleware, softDeleteTask);

module.exports = router;
