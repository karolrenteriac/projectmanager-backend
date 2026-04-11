const chatService = require("../services/chatService");
const notificationService = require("../services/notificationService");
const { handleError } = require("../utils/handleError");
const { getIo } = require("../config/io");
const { 
  toChatDTO, 
  toMessageDTO, 
  toMessageWithChatDTO 
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
        items: result.items,
        pagination: result.pagination
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
    
    const notifications = await notificationService.createMessageNotifications(
      chatId,
      message,
      senderId,
      chat.members
    );

    const io = getIo();
    if (io) {
      io.to(chatId).emit("newMessage", toMessageDTO(message));
      
      notifications.forEach(notification => {
        io.to(notification.user._id.toString()).emit("notification", notification);
      });
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

module.exports = {
  createChat,
  getChatMessages,
  sendMessage,
  getUserChats,
  joinChat,
};
