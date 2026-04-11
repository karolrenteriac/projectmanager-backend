const Notification = require("../models/notification");
const { AppError } = require("../errors/AppError");
const { NOTIFICATION_TYPES } = require("../constants");
const { getPaginationParams, createPaginatedResponse } = require("../utils/pagination");

async function createNotification(userId, type, message, entityId = null, entityType = null) {
  if (!userId || !type || !message) {
    throw new AppError(400, "User ID, type, and message are required.");
  }

  if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
    throw new AppError(400, `Type must be one of: ${Object.values(NOTIFICATION_TYPES).join(", ")}.`);
  }

  const notification = await Notification.create({
    user: userId,
    type,
    message: message.trim(),
    entityId,
    entityType,
  });

  return await Notification.findById(notification._id)
    .populate('user', 'name email');
}

async function getUserNotifications(userId, page = 1, limit = 20, unreadOnly = false) {
  if (!userId) {
    throw new AppError(400, "User ID is required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });
  
  let query = { user: userId };
  if (unreadOnly) {
    query.read = false;
  }

  const notifications = await Notification.find(query)
    .populate('entityId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ user: userId, read: false });

  return {
    ...createPaginatedResponse(notifications, total, page, validatedLimit),
    unreadCount,
  };
}

async function markNotificationAsRead(notificationId, userId) {
  if (!notificationId) {
    throw new AppError(400, "Notification ID is required.");
  }

  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) {
    throw new AppError(404, "Notification not found.");
  }

  notification.read = true;
  await notification.save();

  return notification;
}

async function markAllNotificationsAsRead(userId) {
  if (!userId) {
    throw new AppError(400, "User ID is required.");
  }

  const result = await Notification.updateMany(
    { user: userId, read: false },
    { read: true }
  );

  return {
    modifiedCount: result.modifiedCount,
  };
}

async function getUnreadCount(userId) {
  if (!userId) {
    throw new AppError(400, "User ID is required.");
  }

  const count = await Notification.countDocuments({ user: userId, read: false });
  return { unreadCount: count };
}

async function createMessageNotifications(chatId, message, senderId, chatMembers) {
  const notifications = [];
  
  for (const memberId of chatMembers) {
    if (memberId.toString() !== senderId.toString()) {
      const notification = await createNotification(
        memberId,
        NOTIFICATION_TYPES.MESSAGE_RECEIVED,
        `New message in chat: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
        message._id,
        'Message'
      );
      notifications.push(notification);
    }
  }

  return notifications;
}

async function createTaskAssignedNotification(taskId, assignedUserId, taskTitle) {
  return await createNotification(
    assignedUserId,
    NOTIFICATION_TYPES.TASK_ASSIGNED,
    `You have been assigned to task: ${taskTitle}`,
    taskId,
    'Task'
  );
}

async function createProjectUpdatedNotification(projectId, projectMembers, projectName, updatedBy) {
  const notifications = [];
  
  for (const memberId of projectMembers) {
    if (memberId.toString() !== updatedBy.toString()) {
      const notification = await createNotification(
        memberId,
        NOTIFICATION_TYPES.PROJECT_UPDATED,
        `Project "${projectName}" has been updated`,
        projectId,
        'Project'
      );
      notifications.push(notification);
    }
  }

  return notifications;
}

async function createDocumentUploadedNotification(documentId, projectMembers, documentName, uploadedBy) {
  const notifications = [];
  
  for (const memberId of projectMembers) {
    if (memberId.toString() !== uploadedBy.toString()) {
      const notification = await createNotification(
        memberId,
        NOTIFICATION_TYPES.DOCUMENT_UPLOADED,
        `New document "${documentName}" uploaded to project`,
        documentId,
        'Document'
      );
      notifications.push(notification);
    }
  }

  return notifications;
}

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  createMessageNotifications,
  createTaskAssignedNotification,
  createProjectUpdatedNotification,
  createDocumentUploadedNotification,
};
