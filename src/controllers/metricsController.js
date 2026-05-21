const mongoose = require("mongoose");
const activityLogService = require("../services/activityLogService");
const Project = require("../models/project");
const Task = require("../models/task");
const Document = require("../models/document");
const User = require("../models/user");
const { handleError } = require("../utils/handleError");

const getDashboardMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const orgId = req.user?.organization
      ? new mongoose.Types.ObjectId(req.user.organization)
      : null;

    // Org-scoped project filter — all deleted entities are invisible
    const projectFilter = { isDeleted: false };
    if (orgId) projectFilter.organization = orgId;

    // Derive active project IDs once; reused for all task queries
    const activeProjectIds = await Project.distinct("_id", projectFilter);
    const taskFilter = { isDeleted: false, project: { $in: activeProjectIds } };

    const userFilter = { isDeleted: false };
    if (orgId) userFilter.organization = orgId;

    const [totalProjects, totalTasks, completedTasks, activeUsers] = await Promise.all([
      Project.countDocuments(projectFilter),
      Task.countDocuments(taskFilter),
      Task.countDocuments({ ...taskFilter, status: "done" }),
      User.countDocuments(userFilter),
    ]);

    // Count documents only if the Document model has an organization field
    let documentsUploaded = 0;
    try {
      const docFilter = { isDeleted: false };
      if (orgId) docFilter.organization = orgId;
      documentsUploaded = await Document.countDocuments(docFilter);
    } catch (_) {
      documentsUploaded = await Document.countDocuments({});
    }

    const tasksByUser = await Task.aggregate([
      { $match: { ...taskFilter } },
      {
        $group: {
          _id: "$assignedTo",
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userName: { $concat: ["$user.name", " (", "$user.email", ")"] },
          totalTasks: "$count",
          completedTasks: "$completed",
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ["$completed", "$count"] }, 100] },
              2,
            ],
          },
        },
      },
      { $sort: { totalTasks: -1 } },
      { $limit: 10 },
    ]);

    const recentActivity = await activityLogService.getRecentActivity(10);

    const activityMetrics = await activityLogService.getActivityMetrics({
      startDate,
      endDate,
    });

    const projectMetrics = await Project.aggregate([
      { $match: projectFilter },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          activeProjects: {
            $sum: { $cond: [{ $ne: ["$status", "completed"] }, 1, 0] },
          },
          completedProjects: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
    ]);

    const taskMetrics = await Task.aggregate([
      { $match: taskFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: "$count" },
          statusBreakdown: {
            $push: {
              status: "$_id",
              count: "$count",
            },
          },
        },
      },
    ]);

    return res.json({
      success: true,
      data: {
        overview: {
          totalProjects,
          totalTasks,
          completedTasks,
          documentsUploaded,
          activeUsers,
          completionRate:
            totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
        tasksByUser,
        recentActivity,
        projectMetrics: projectMetrics[0] || {},
        taskMetrics: taskMetrics[0] || {},
        activityMetrics,
      },
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getUserMetrics = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const uid = new mongoose.Types.ObjectId(userId);

    const userTasks = await Task.aggregate([
      { $match: { assignedTo: uid, isDeleted: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const userDocuments = await Document.countDocuments({ createdBy: uid });
    const userProjects = await Project.countDocuments({
      createdBy: uid,
      isDeleted: false,
    });

    const userActivity = await activityLogService.getUserActivityLogs(
      userId,
      1,
      50,
      { startDate, endDate }
    );

    return res.json({
      success: true,
      data: {
        userId,
        taskBreakdown: userTasks,
        totalDocuments: userDocuments,
        totalProjects: userProjects,
        recentActivity: userActivity.items,
      },
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getActivityLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      entity,
      userId,
      startDate,
      endDate,
    } = req.query;

    const filters = {};
    if (action) filters.action = action;
    if (entity) filters.entity = entity;
    if (userId) filters.userId = userId;
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    const result = await activityLogService.getSystemActivityLogs(
      parseInt(page),
      parseInt(limit),
      filters
    );

    return res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getEntityActivity = async (req, res, next) => {
  try {
    const { entity, entityId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await activityLogService.getEntityActivityLogs(
      entity,
      entityId,
      parseInt(page),
      parseInt(limit)
    );

    return res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  getDashboardMetrics,
  getUserMetrics,
  getActivityLogs,
  getEntityActivity,
};
