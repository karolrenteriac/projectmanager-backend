const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const {
  getGovernanceData,
  getProjectReport,
  assignCoordinator,
} = require("../controllers/adminGovernanceController");

const router = express.Router();

router.use(protect);
router.use(strictRoleMiddleware(["admin"]));

router.get("/governance", getGovernanceData);
router.get("/:id/report", getProjectReport);
router.patch("/:id/coordinator", assignCoordinator);

module.exports = router;
