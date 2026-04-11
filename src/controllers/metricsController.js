const activityLogService = require("../services/activityLogService");
const Project = require("../models/project");
const Task = require("../models/task");
const Document = require("../models/document");
const User = require("../models/user");
const { handleError } = require("../utils/handleError");

const getDashboardMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const [totalProjects, totalTasks, completedTasks, documentsUploaded, activeUsers] = await Promise.all([
      Project.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({ status: 'completed' }),
      Document.countDocuments(),
      User.countDocuments({ lastLogin: { $exists: true, $ne: null } })
    ]);

    const tasksByUser = await Task.aggregate([
      {
        $group: {
          _id: '$assignedTo',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userName: { $concat: ['$user.name', ' (', '$user.email', ')'] },
          totalTasks: '$count',
          completedTasks: '$completed',
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completed', '$count'] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { totalTasks: -1 } },
      { $limit: 10 }
    ]);

    const recentActivity = await activityLogService.getRecentActivity(10);

    const activityMetrics = await activityLogService.getActivityMetrics({
      startDate,
      endDate
    });

    const projectMetrics = await Project.aggregate([
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          activeProjects: {
            $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] }
          },
          completedProjects: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    const taskMetrics = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: '$count' },
          statusBreakdown: {
            $push: {
              status: '$_id',
              count: '$count'
            }
          }
        }
      }
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
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        tasksByUser,
        recentActivity,
        projectMetrics: projectMetrics[0] || {},
        taskMetrics: taskMetrics[0] || {},
        activityMetrics
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

    const userTasks = await Task.aggregate([
      { $match: { assignedTo: { $oid: userId } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const userDocuments = await Document.countDocuments({ createdBy: { $oid: userId } });
    const userProjects = await Project.countDocuments({ createdBy: { $oid: userId } });

    const userActivity = await activityLogService.getUserActivityLogs(userId, 1, 50, {
      startDate,
      endDate
    });

    return res.json({
      success: true,
      data: {
        userId,
        taskBreakdown: userTasks,
        totalDocuments: userDocuments,
        totalProjects: userProjects,
        recentActivity: userActivity.items
      },
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getActivityLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action, entity, userId, startDate, endDate } = req.query;

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

    return res.json({
      success: true,
      data: result,
    });
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

    return res.json({
      success: true,
      data: result,
    });
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
