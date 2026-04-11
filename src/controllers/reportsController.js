const reportsService = require("../services/reportsService");
const { handleError } = require("../utils/handleError");

const generateProjectsReport = async (req, res, next) => {
  try {
    const { format = 'pdf', status, startDate, endDate } = req.query;

    const reportData = await reportsService.generateProjectsReport(format, {
      status,
      startDate,
      endDate
    });

    res.setHeader('Content-Type', reportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
    res.send(reportData.buffer);
  } catch (err) {
    handleError(err, res, next);
  }
};

const generateProjectsExcel = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;

    const reportData = await reportsService.generateProjectsReport('excel', {
      status,
      startDate,
      endDate
    });

    res.setHeader('Content-Type', reportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
    res.send(reportData.buffer);
  } catch (err) {
    handleError(err, res, next);
  }
};

const generateTasksReport = async (req, res, next) => {
  try {
    const { format = 'pdf', status, assignedTo, projectId, startDate, endDate } = req.query;

    const reportData = await reportsService.generateTasksReport(format, {
      status,
      assignedTo,
      projectId,
      startDate,
      endDate
    });

    res.setHeader('Content-Type', reportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
    res.send(reportData.buffer);
  } catch (err) {
    handleError(err, res, next);
  }
};

const generateTasksExcel = async (req, res, next) => {
  try {
    const { status, assignedTo, projectId, startDate, endDate } = req.query;

    const reportData = await reportsService.generateTasksReport('excel', {
      status,
      assignedTo,
      projectId,
      startDate,
      endDate
    });

    res.setHeader('Content-Type', reportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
    res.send(reportData.buffer);
  } catch (err) {
    handleError(err, res, next);
  }
};

const generateUserActivityReport = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { format = 'pdf', startDate, endDate } = req.query;

    const reportData = await reportsService.generateUserActivityReport(userId, format, {
      startDate,
      endDate
    });

    res.setHeader('Content-Type', reportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
    res.send(reportData.buffer);
  } catch (err) {
    handleError(err, res, next);
  }
};

const generateUserActivityExcel = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const reportData = await reportsService.generateUserActivityReport(userId, 'excel', {
      startDate,
      endDate
    });

    res.setHeader('Content-Type', reportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
    res.send(reportData.buffer);
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  generateProjectsReport,
  generateProjectsExcel,
  generateTasksReport,
  generateTasksExcel,
  generateUserActivityReport,
  generateUserActivityExcel,
};
