const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const {
  getOverview,
  getActivity,
} = require("../controllers/coResearcherDashboardController");

const router = express.Router();

// All co-researcher dashboard routes require authentication and co-researcher role
router.use(protect);
router.use(strictRoleMiddleware(["co-researcher"]));

router.get("/overview", getOverview);
router.get("/activity", getActivity);

module.exports = router;
