const express = require("express");
const { 
  generateProjectsReport, 
  generateProjectsExcel, 
  generateTasksReport, 
  generateTasksExcel, 
  generateUserActivityReport, 
  generateUserActivityExcel 
} = require("../controllers/reportsController");
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router.get("/projects/pdf", roleMiddleware(["admin"]), generateProjectsReport);
router.get("/projects/excel", roleMiddleware(["admin"]), generateProjectsExcel);

router.get("/tasks/pdf", roleMiddleware(["admin"]), generateTasksReport);
router.get("/tasks/excel", roleMiddleware(["admin"]), generateTasksExcel);

router.get("/user/:userId/pdf", generateUserActivityReport);
router.get("/user/:userId/excel", generateUserActivityExcel);

module.exports = router;
