const reportService = require("../services/reportService");
const { handleError } = require("../utils/handleError");

// GET /api/reports/overview — KPIs, metrics block and chart datasets.
const getOverview = async (req, res, next) => {
  try {
    const data = await reportService.getOverview(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/reports/projects — per-project progress breakdown.
const getProjectsReport = async (req, res, next) => {
  try {
    const data = await reportService.getProjectsReport(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/reports/tasks — task status / priority / completion analytics.
const getTasksReport = async (req, res, next) => {
  try {
    const data = await reportService.getTasksReport(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/reports/activity — paginated activity audit log.
const getActivityReport = async (req, res, next) => {
  try {
    const data = await reportService.getActivityReport(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/reports/deliverables — deliverable review analytics.
const getDeliverablesReport = async (req, res, next) => {
  try {
    const data = await reportService.getDeliverablesReport(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/reports/filters — option lists for the report generator.
const getFilterOptions = async (req, res, next) => {
  try {
    const data = await reportService.getFilterOptions(req.user);
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// POST /api/reports/generate/pdf — build a PDF report and persist it.
const generatePdf = async (req, res, next) => {
  try {
    const report = await reportService.generateReport(req.user, "pdf", req.body);
    res.status(201).json({ success: true, report });
  } catch (err) {
    handleError(err, res, next);
  }
};

// POST /api/reports/generate/excel — build an Excel report and persist it.
const generateExcel = async (req, res, next) => {
  try {
    const report = await reportService.generateReport(req.user, "excel", req.body);
    res.status(201).json({ success: true, report });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/reports/history — previously generated reports.
const getHistory = async (req, res, next) => {
  try {
    const data = await reportService.getHistory(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  getOverview,
  getProjectsReport,
  getTasksReport,
  getActivityReport,
  getDeliverablesReport,
  getFilterOptions,
  generatePdf,
  generateExcel,
  getHistory,
};
