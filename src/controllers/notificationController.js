const notificationService = require("../services/notificationService");
const { handleError } = require("../utils/handleError");
const { 
  toNotificationDTO, 
  toUnreadCountDTO 
} = require("../dtos");

const getUserNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user.userId;

    const result = await notificationService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit),
      unreadOnly === 'true'
    );

    return res.json({
      success: true,
      data: {
        items: result.items.map(toNotificationDTO),
        pagination: result.pagination,
        unreadCount: result.unreadCount
      },
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await notificationService.markNotificationAsRead(id, userId);

    return res.json({
      success: true,
      message: "Notification marked as read.",
      data: toNotificationDTO(notification),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await notificationService.markAllNotificationsAsRead(userId);

    return res.json({
      success: true,
      message: "All notifications marked as read.",
      data: result,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await notificationService.getUnreadCount(userId);

    return res.json({
      success: true,
      data: toUnreadCountDTO(result),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
};
