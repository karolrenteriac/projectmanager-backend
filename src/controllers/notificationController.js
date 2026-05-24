const notificationService = require("../services/notificationService");
const { handleError } = require("../utils/handleError");
const { toNotificationDTO, toUnreadCountDTO } = require("../dtos");

/**
 * GET /api/notifications
 * Query: page, limit, unreadOnly, type, category, priority, search, dateFrom, dateTo
 * Strictly scoped to the authenticated user.
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 20,
      unreadOnly,
      type,
      category,
      priority,
      search,
      dateFrom,
      dateTo,
    } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      unreadOnly,
      type,
      category,
      priority,
      search,
      dateFrom,
      dateTo,
    });

    return res.json({
      success: true,
      data: {
        items: result.items.map(toNotificationDTO),
        pagination: result.pagination,
        unreadCount: result.unreadCount,
      },
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

/** GET /api/notifications/unread-count */
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount(req.user.userId);
    return res.json({ success: true, data: toUnreadCountDTO(result) });
  } catch (err) {
    handleError(err, res, next);
  }
};

/** PATCH /api/notifications/:id/read */
const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markNotificationAsRead(
      req.params.id,
      req.user.userId
    );
    return res.json({
      success: true,
      message: "Notification marked as read.",
      data: toNotificationDTO(notification),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

/** PATCH /api/notifications/read-all */
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsAsRead(req.user.userId);
    return res.json({
      success: true,
      message: "All notifications marked as read.",
      data: result,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

/** DELETE /api/notifications/:id */
const deleteNotification = async (req, res, next) => {
  try {
    const result = await notificationService.deleteNotification(
      req.params.id,
      req.user.userId
    );
    return res.json({
      success: true,
      message: "Notification deleted.",
      data: result,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
