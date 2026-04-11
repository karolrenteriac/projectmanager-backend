const ActivityLog = require("../models/activityLog");
const { AppError } = require("../errors/AppError");
const { getPaginationParams, createPaginatedResponse } = require("../utils/pagination");

async function logActivity(userId, action, entity, entityId, metadata = {}, ipAddress, userAgent) {
  if (!userId || !action || !entity || !entityId) {
    throw new AppError(400, "User ID, action, entity, and entity ID are required.");
  }

  const log = await ActivityLog.create({
    user: userId,
    action: action.trim(),
    entity,
    entityId,
    metadata,
    ipAddress,
    userAgent,
  });

  return await ActivityLog.findById(log._id)
    .populate('user', 'name email');
}

async function getUserActivityLogs(userId, page = 1, limit = 20, filters = {}) {
  if (!userId) {
    throw new AppError(400, "User ID is required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });

  let query = { user: userId };
  
  if (filters.action) {
    query.action = filters.action;
  }
  
  if (filters.entity) {
    query.entity = filters.entity;
  }
  
  if (filters.startDate && filters.endDate) {
    query.createdAt = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate),
    };
  }

  const logs = await ActivityLog.find(query)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await ActivityLog.countDocuments(query);

  return createPaginatedResponse(logs, total, page, validatedLimit);
}

async function getSystemActivityLogs(page = 1, limit = 20, filters = {}) {
  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });

  let query = {};
  
  if (filters.action) {
    query.action = filters.action;
  }
  
  if (filters.entity) {
    query.entity = filters.entity;
  }
  
  if (filters.userId) {
    query.user = filters.userId;
  }
  
  if (filters.startDate && filters.endDate) {
    query.createdAt = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate),
    };
  }

  const logs = await ActivityLog.find(query)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await ActivityLog.countDocuments(query);

  return createPaginatedResponse(logs, total, page, validatedLimit);
}

async function getEntityActivityLogs(entity, entityId, page = 1, limit = 20) {
  if (!entity || !entityId) {
    throw new AppError(400, "Entity and entity ID are required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });

  const logs = await ActivityLog.find({ entity, entityId })
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await ActivityLog.countDocuments({ entity, entityId });

  return createPaginatedResponse(logs, total, page, validatedLimit);
}

async function getActivityMetrics(filters = {}) {
  let matchStage = {};
  
  if (filters.startDate && filters.endDate) {
    matchStage.createdAt = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate),
    };
  }
  
  if (filters.userId) {
    matchStage.user = { $oid: filters.userId };
  }

  const metrics = await ActivityLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          action: '$action',
          entity: '$entity',
        },
        count: { $sum: 1 },
        latestDate: { $max: '$createdAt' },
      },
    },
    {
      $group: {
        _id: '$_id.entity',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count',
            latestDate: '$latestDate',
          },
        },
        totalCount: { $sum: '$count' },
      },
    },
    {
      $sort: { totalCount: -1 },
    },
  ]);

  const totalActivities = await ActivityLog.countDocuments(matchStage);
  const uniqueUsers = await ActivityLog.distinct('user', matchStage);

  return {
    metrics,
    totalActivities,
    uniqueUsers: uniqueUsers.length,
  };
}

async function getRecentActivity(limit = 10) {
  const logs = await ActivityLog.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit);

  return logs;
}

module.exports = {
  logActivity,
  getUserActivityLogs,
  getSystemActivityLogs,
  getEntityActivityLogs,
  getActivityMetrics,
  getRecentActivity,
};
