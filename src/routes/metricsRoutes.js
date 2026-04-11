const express = require("express");
const { 
  getDashboardMetrics, 
  getUserMetrics, 
  getActivityLogs, 
  getEntityActivity 
} = require("../controllers/metricsController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/dashboard", roleMiddleware(["admin"]), getDashboardMetrics);

router.get("/user/:userId", getUserMetrics);

router.get("/activity", getActivityLogs);

router.get("/activity/:entity/:entityId", getEntityActivity);

module.exports = router;
