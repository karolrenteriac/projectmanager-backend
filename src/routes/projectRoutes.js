const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  softDeleteProject,
  exportProject,
} = require("../controllers/projectController");

const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", protect, roleMiddleware(["admin", "coordinator"]), createProject);
router.get("/", protect, getProjects);
router.get("/:id/export", protect, exportProject);
router.get("/:id", protect, getProjectById);
router.put("/:id", protect, updateProject);
router.delete("/:id", protect, softDeleteProject);

module.exports = router;
