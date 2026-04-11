const chatService = require("./chatService");
const notificationService = require("./notificationService");
const { SOCKET_EVENTS } = require("../constants");
const { 
  toMessageDTO, 
  toNotificationDTO 
} = require("../dtos");

class SocketService {
  constructor(io) {
    this.io = io;
  }

  async handleJoinChat(socket, data) {
    try {
      const { chatId, userId } = data;
      
      if (!chatId || !userId) {
        console.log(`[Socket Service] joinChat ignored (missing data) from ${socket.id}`);
        return;
      }

      await chatService.validateChatAccess(chatId, userId);
      
      socket.join(chatId);
      socket.join(userId);
      
      console.log(`[Socket Service] ${socket.id} joined chat "${chatId}" and user room "${userId}"`);
      
      socket.emit(SOCKET_EVENTS.USER_CONNECTED, { chatId, userId });
    } catch (error) {
      console.error(`[Socket Service] Error joining chat:`, error.message);
      socket.emit("error", { message: error.message });
    }
  }

  handleLeaveChat(socket, data) {
    const { chatId, userId } = data;
    
    if (chatId) {
      socket.leave(chatId);
      console.log(`[Socket Service] ${socket.id} left chat "${chatId}"`);
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const { chatId, content, senderId } = data;
      
      if (!chatId || !content || !senderId) {
        console.log(`[Socket Service] sendMessage ignored (missing data) from ${socket.id}`);
        return;
      }

      const message = await chatService.sendMessage(chatId, senderId, content);
      const chat = await chatService.validateChatAccess(chatId, senderId);
      
      const notifications = await notificationService.createMessageNotifications(
        chatId,
        message,
        senderId,
        chat.members
      );

      this.io.to(chatId).emit(SOCKET_EVENTS.NEW_MESSAGE, toMessageDTO(message));
      
      notifications.forEach(notification => {
        this.io.to(notification.user._id.toString()).emit(
          SOCKET_EVENTS.NOTIFICATION, 
          toNotificationDTO(notification)
        );
      });
      
      console.log(`[Socket Service] Message sent in chat "${chatId}" by ${senderId}`);
    } catch (error) {
      console.error(`[Socket Service] Error sending message:`, error.message);
      socket.emit("error", { message: error.message });
    }
  }

  emitToUser(userId, event, data) {
    if (this.io) {
      this.io.to(userId).emit(event, data);
    }
  }

  emitToChat(chatId, event, data) {
    if (this.io) {
      this.io.to(chatId).emit(event, data);
    }
  }
}

module.exports = SocketService;
