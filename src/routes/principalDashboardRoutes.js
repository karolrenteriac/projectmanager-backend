const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const {
  getOverview,
  getProjects,
  getActivity,
  getWorkload,
} = require("../controllers/principalDashboardController");

const router = express.Router();

router.use(protect);
router.use(strictRoleMiddleware(["principal"]));

router.get("/overview", getOverview);
router.get("/projects", getProjects);
router.get("/activity", getActivity);
router.get("/workload", getWorkload);

module.exports = router;
