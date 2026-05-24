const mongoose = require("mongoose");
const Notification = require("../models/notification");
const { AppError } = require("../errors/AppError");
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_BY_TYPE,
  SOCKET_EVENTS,
  getDefaultPriority,
} = require("../constants");
const { getPaginationParams, createPaginatedResponse } = require("../utils/pagination");
const { getIo } = require("../config/io");
const { toNotificationDTO } = require("../dtos");

// Reverse map: category → list of notification types (for filter queries).
const TYPES_BY_CATEGORY = Object.entries(NOTIFICATION_CATEGORY_BY_TYPE).reduce(
  (acc, [type, category]) => {
    (acc[category] = acc[category] || []).push(type);
    return acc;
  },
  {}
);

const POPULATE_OPTIONS = [
  // `user` is populated so the legacy chat path can read notification.user._id.
  { path: "user", select: "name email" },
  { path: "sender", select: "name email avatar role" },
  { path: "project", select: "title status" },
  { path: "task", select: "title status" },
  { path: "deliverable", select: "title status" },
];

/**
 * Push a notification to its recipient's socket room in real time.
 * Best-effort — never throws into the calling workflow.
 */
async function emitRealtimeNotification(userId, notification) {
  try {
    const io = getIo();
    if (!io || !userId) return;

    const room = String(userId);
    io.to(room).emit(SOCKET_EVENTS.NEW_NOTIFICATION, toNotificationDTO(notification));

    const unreadCount = await Notification.countDocuments({ user: userId, read: false });
    io.to(room).emit(SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount });
  } catch (err) {
    console.error("[notificationService] realtime emit failed:", err.message);
  }
}

/**
 * Create a single notification and push it in real time.
 *
 * @param {Object} payload
 * @param {string} payload.recipient  Recipient user id (alias: `user`)
 * @param {string} [payload.sender]   Actor user id
 * @param {string} payload.type       NOTIFICATION_TYPES value
 * @param {string} [payload.title]
 * @param {string} payload.message
 * @param {string} [payload.priority] Defaults to the type's default priority
 * @param {string} [payload.project]
 * @param {string} [payload.task]
 * @param {string} [payload.deliverable]
 * @param {string} [payload.link]
 * @param {Object} [payload.metadata]
 * @param {string} [payload.entityId]   Legacy generic reference
 * @param {string} [payload.entityType] Legacy generic reference
 */
async function createNotification(payload = {}) {
  const recipient = payload.recipient || payload.user;
  const { type, message } = payload;

  if (!recipient || !type || !message) {
    throw new AppError(400, "Recipient, type, and message are required.");
  }
  if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
    throw new AppError(400, `Unknown notification type: ${type}.`);
  }

  const notification = await Notification.create({
    user: recipient,
    sender: payload.sender || null,
    type,
    title: payload.title ? String(payload.title).trim() : undefined,
    message: String(message).trim(),
    priority: payload.priority || getDefaultPriority(type),
    project: payload.project || null,
    task: payload.task || null,
    deliverable: payload.deliverable || null,
    link: payload.link || null,
    metadata: payload.metadata || {},
    entityId: payload.entityId,
    entityType: payload.entityType,
  });

  const populated = await Notification.findById(notification._id).populate(POPULATE_OPTIONS);

  await emitRealtimeNotification(recipient, populated);

  return populated;
}

/**
 * Create the same notification for many recipients at once.
 * Recipient ids are de-duplicated; the sender is excluded so actors never
 * get notified about their own action.
 *
 * @param {Array<string>} recipients
 * @param {Object} basePayload  Same shape as createNotification (minus recipient)
 */
async function createBulkNotifications(recipients = [], basePayload = {}) {
  const senderId = basePayload.sender ? String(basePayload.sender) : null;

  const uniqueRecipients = [
    ...new Set(
      (recipients || [])
        .filter(Boolean)
        .map((r) => String(r._id || r))
    ),
  ].filter((id) => id !== senderId);

  const results = [];
  for (const recipient of uniqueRecipients) {
    try {
      results.push(await createNotification({ ...basePayload, recipient }));
    } catch (err) {
      console.error("[notificationService] bulk create failed:", err.message);
    }
  }
  return results;
}

/**
 * Fetch a user's notifications with filtering, search and pagination.
 * Strictly scoped to the requesting user — no cross-user access.
 */
async function getUserNotifications(userId, options = {}) {
  if (!userId) throw new AppError(400, "User ID is required.");

  const { page, limit, skip } = getPaginationParams(options);

  const query = { user: userId };

  if (options.unreadOnly === true || options.unreadOnly === "true") {
    query.read = false;
  }
  if (options.type) {
    query.type = options.type;
  }
  if (options.category) {
    const types = TYPES_BY_CATEGORY[options.category];
    if (types) query.type = { $in: types };
  }
  if (options.priority) {
    query.priority = options.priority;
  }
  if (options.search && String(options.search).trim()) {
    const safe = String(options.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    query.$or = [{ title: rx }, { message: rx }];
  }
  if (options.dateFrom || options.dateTo) {
    query.createdAt = {};
    if (options.dateFrom) query.createdAt.$gte = new Date(options.dateFrom);
    if (options.dateTo) query.createdAt.$lte = new Date(options.dateTo);
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate(POPULATE_OPTIONS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: userId, read: false }),
  ]);

  return {
    ...createPaginatedResponse(notifications, total, page, limit),
    unreadCount,
  };
}

async function markNotificationAsRead(notificationId, userId) {
  if (!notificationId || !mongoose.Types.ObjectId.isValid(String(notificationId))) {
    throw new AppError(400, "A valid notification ID is required.");
  }

  // Ownership enforced in the query — a user can only read their own.
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) throw new AppError(404, "Notification not found.");

  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
  }

  const populated = await Notification.findById(notification._id).populate(POPULATE_OPTIONS);

  const io = getIo();
  if (io) {
    const unreadCount = await Notification.countDocuments({ user: userId, read: false });
    io.to(String(userId)).emit(SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount });
  }

  return populated;
}

async function markAllNotificationsAsRead(userId) {
  if (!userId) throw new AppError(400, "User ID is required.");

  const result = await Notification.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );

  const io = getIo();
  if (io) {
    io.to(String(userId)).emit(SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount: 0 });
  }

  return { modifiedCount: result.modifiedCount };
}

async function deleteNotification(notificationId, userId) {
  if (!notificationId || !mongoose.Types.ObjectId.isValid(String(notificationId))) {
    throw new AppError(400, "A valid notification ID is required.");
  }

  // Ownership enforced in the query.
  const notification = await Notification.findOneAndDelete({ _id: notificationId, user: userId });
  if (!notification) throw new AppError(404, "Notification not found.");

  const io = getIo();
  if (io) {
    const unreadCount = await Notification.countDocuments({ user: userId, read: false });
    io.to(String(userId)).emit(SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount });
  }

  return { deleted: true };
}

async function getUnreadCount(userId) {
  if (!userId) throw new AppError(400, "User ID is required.");
  const count = await Notification.countDocuments({ user: userId, read: false });
  return { unreadCount: count };
}

/**
 * Legacy chat path — one notification per chat member except the sender.
 * Retained so the existing chat/socket code keeps working unchanged.
 */
async function createMessageNotifications(chatId, message, senderId, chatMembers) {
  const recipients = (chatMembers || []).filter(
    (m) => String(m) !== String(senderId)
  );
  const preview = `${message.content.substring(0, 50)}${
    message.content.length > 50 ? "..." : ""
  }`;

  return createBulkNotifications(recipients, {
    sender: senderId,
    type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
    title: "New message",
    message: preview,
    priority: NOTIFICATION_PRIORITIES.LOW,
    entityId: message._id,
    entityType: "Message",
    link: "/chat",
    metadata: { chatId: String(chatId) },
  });
}

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  emitRealtimeNotification,
  createMessageNotifications,
  NOTIFICATION_CATEGORIES,
};
