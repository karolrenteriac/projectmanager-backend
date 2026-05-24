const { getNotificationCategory } = require("../constants");

/** Normalize a possibly-populated ref into a compact { id, ... } shape. */
function refDTO(ref, fields = []) {
  if (!ref) return null;
  // Unpopulated — a string or ObjectId has no own `_id`. A populated
  // document always does.
  if (!ref._id) {
    return { id: String(ref) };
  }
  const out = { id: String(ref._id) };
  for (const f of fields) {
    if (ref[f] !== undefined) out[f] = ref[f];
  }
  return out;
}

function toNotificationDTO(notification) {
  if (!notification) return null;

  const id =
    notification._id != null ? notification._id.toString() : String(notification.id);

  return {
    id,
    type: notification.type,
    category: getNotificationCategory(notification.type),
    title: notification.title || null,
    message: notification.message,
    priority: notification.priority || "MEDIUM",
    read: Boolean(notification.read),
    readAt: notification.readAt || null,
    link: notification.link || null,
    user: refDTO(notification.user, ["name", "email"]),
    sender: refDTO(notification.sender, ["name", "email", "avatar", "role"]),
    project: refDTO(notification.project, ["title", "status"]),
    task: refDTO(notification.task, ["title", "status"]),
    deliverable: refDTO(notification.deliverable, ["title"]),
    metadata: notification.metadata || {},
    entityId: notification.entityId || null,
    entityType: notification.entityType || null,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

function toNotificationSummaryDTO(notification) {
  if (!notification) return null;
  const id =
    notification._id != null ? notification._id.toString() : String(notification.id);

  return {
    id,
    type: notification.type,
    category: getNotificationCategory(notification.type),
    title: notification.title || null,
    message: notification.message,
    priority: notification.priority || "MEDIUM",
    read: Boolean(notification.read),
    link: notification.link || null,
    createdAt: notification.createdAt,
  };
}

function toUnreadCountDTO(payload) {
  const unreadCount =
    payload && typeof payload === "object" ? payload.unreadCount : payload;
  return { unreadCount: unreadCount || 0 };
}

module.exports = {
  toNotificationDTO,
  toNotificationSummaryDTO,
  toUnreadCountDTO,
};
