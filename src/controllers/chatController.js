const chatService = require("../services/chatService");
const notificationService = require("../services/notificationService");
const { handleError } = require("../utils/handleError");
const { getIo } = require("../config/io");
const {
  toChatDTO,
  toMessageDTO,
  toMessageWithChatDTO,
  toUserDTO,
} = require("../dtos");

const createChat = async (req, res, next) => {
  try {
    const { type, projectId, taskId, members } = req.body;
    const createdBy = req.user.userId;

    const chat = await chatService.createChat(type, projectId, taskId, members, createdBy);

    return res.status(201).json({
      success: true,
      message: "Chat created successfully.",
      data: toChatDTO(chat),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getChatMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    const result = await chatService.getChatMessages(id, userId, parseInt(page), parseInt(limit));

    return res.json({
      success: true,
      data: {
        items: result.items.map(toMessageDTO),
        pagination: result.pagination,
      },
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { chatId, content } = req.body;
    const senderId = req.user.userId;

    const message = await chatService.sendMessage(chatId, senderId, content);

    const chat = await chatService.validateChatAccess(chatId, senderId);

    notificationService.createMessageNotifications(
      chatId,
      message,
      senderId,
      chat.members
    ).catch((err) => console.error("[Chat Controller] Notification error:", err.message));

    const io = getIo();
    if (io) {
      io.to(chatId).emit("newMessage", toMessageDTO(message));
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: toMessageWithChatDTO(message),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getUserChats = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    const result = await chatService.getUserChats(userId, parseInt(page), parseInt(limit));

    return res.json({
      success: true,
      data: {
        items: result.items.map(toChatDTO),
        pagination: result.pagination
      },
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const joinChat = async (req, res, next) => {
  try {
    const { chatId } = req.body;
    const userId = req.user.userId;

    await chatService.validateChatAccess(chatId, userId);

    return res.json({
      success: true,
      message: "Access validated for chat.",
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getMessageableUsers = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const users = await chatService.getMessageableUsers(userId);

    return res.json({
      success: true,
      data: users.map(toUserDTO),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const count = await chatService.getUnreadCount(userId);
    return res.json({ success: true, count });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  createChat,
  getChatMessages,
  sendMessage,
  getUserChats,
  joinChat,
  getMessageableUsers,
  getUnreadCount,
};
