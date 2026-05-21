const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const {
  getOverview,
  getProjects,
  getReviews,
  getWorkload,
  getProjectOverview,
  getProjectKanban,
} = require("../controllers/coordinatorDashboardController");

const router = express.Router();

// Strict middleware: only coordinator can access
router.use(protect);
router.use(strictRoleMiddleware(["coordinator"]));

router.get("/overview", getOverview);
router.get("/projects", getProjects);
router.get("/reviews", getReviews);
router.get("/workload", getWorkload);
router.get("/projects/:id/overview", getProjectOverview);
router.get("/projects/:id/kanban", getProjectKanban);

module.exports = router;
