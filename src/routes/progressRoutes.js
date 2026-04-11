const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createProgress,
  getProgressByProject,
} = require("../controllers/progressController");

const router = express.Router();

router.post("/", authMiddleware, createProgress);
router.get("/project/:projectId", authMiddleware, getProgressByProject);

module.exports = router;
