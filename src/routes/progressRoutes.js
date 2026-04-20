const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  createProgress,
  getProgressByProject,
} = require("../controllers/progressController");

const router = express.Router();

router.post("/", protect, createProgress);
router.get("/project/:projectId", protect, getProgressByProject);

module.exports = router;
