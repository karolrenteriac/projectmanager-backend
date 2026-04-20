const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getSummary,
  getNotifications,
  getProgress,
  getTaskDistribution,
  getUserActivity,
} = require("../controllers/dashboardController");

const router = express.Router();

// All dashboard routes are protected
router.use(protect);

router.get("/summary", getSummary);
router.get("/notifications", getNotifications);
router.get("/progress", getProgress);
router.get("/task-distribution", getTaskDistribution);
router.get("/user-activity", getUserActivity);

module.exports = router;