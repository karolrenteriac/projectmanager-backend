/**
 * @param {import("mongoose").Document | { _id?: unknown; id?: string; user?: any; type?: string; message?: string; read?: boolean; entityId?: any; entityType?: string; createdAt?: Date; updatedAt?: Date } | null | undefined} notification
 */
function toNotificationDTO(notification) {
  if (!notification) return null;
  
  const id = notification._id != null ? notification._id.toString() : String(notification.id);
  
  return {
    id,
    user: notification.user,
    type: notification.type,
    message: notification.message,
    read: notification.read,
    entityId: notification.entityId,
    entityType: notification.entityType,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

function toNotificationSummaryDTO(notification) {
  if (!notification) return null;
  
  const id = notification._id != null ? notification._id.toString() : String(notification.id);
  
  return {
    id,
    type: notification.type,
    message: notification.message,
    read: notification.read,
    entityId: notification.entityId,
    entityType: notification.entityType,
    createdAt: notification.createdAt,
  };
}

function toUnreadCountDTO(unreadCount) {
  return {
    unreadCount,
  };
}

module.exports = { 
  toNotificationDTO, 
  toNotificationSummaryDTO, 
  toUnreadCountDTO 
};
