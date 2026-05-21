const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const {
  getOverview,
  getProjectsReport,
  getTasksReport,
  getActivityReport,
  getDeliverablesReport,
  getFilterOptions,
  generatePdf,
  generateExcel,
  getHistory,
} = require("../controllers/reportController");

const router = express.Router();

// Diagnostic route — confirms the router is mounted. No auth so it can be
// checked directly in a browser at GET /api/reports/test.
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Reports routes working" });
});

// Admin Reports module — institutional analytics & exports. Admin-only.
router.use(protect);
router.use(strictRoleMiddleware(["admin"]));

router.get("/overview", getOverview);
router.get("/projects", getProjectsReport);
router.get("/tasks", getTasksReport);
router.get("/activity", getActivityReport);
router.get("/deliverables", getDeliverablesReport);
router.get("/filters", getFilterOptions);
router.get("/history", getHistory);

router.post("/generate/pdf", generatePdf);
router.post("/generate/excel", generateExcel);

module.exports = router;
