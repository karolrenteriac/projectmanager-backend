const chatService = require("../services/chatService");
const notificationService = require("../services/notificationService");
const { SOCKET_EVENTS } = require("../constants");

/**
 * @param {import("socket.io").Server} io
 */
module.exports = function registerChatSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[Chat Socket] Connected: ${socket.id}`);

    socket.on(SOCKET_EVENTS.JOIN_CHAT, async (data) => {
      try {
        const { chatId, userId } = data;
        
        if (!chatId || !userId) {
          console.log(`[Chat Socket] joinChat ignored (missing data) from ${socket.id}`);
          return;
        }

        await chatService.validateChatAccess(chatId, userId);
        
        socket.join(chatId);
        socket.join(userId);
        
        console.log(`[Chat Socket] ${socket.id} joined chat "${chatId}" and user room "${userId}"`);
        
        socket.emit(SOCKET_EVENTS.USER_CONNECTED, { chatId, userId });
      } catch (error) {
        console.error(`[Chat Socket] Error joining chat:`, error.message);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_CHAT, (data) => {
      const { chatId, userId } = data;
      
      if (chatId) {
        socket.leave(chatId);
        console.log(`[Chat Socket] ${socket.id} left chat "${chatId}"`);
      }
    });

    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data) => {
      try {
        const { chatId, content, senderId } = data;
        
        if (!chatId || !content || !senderId) {
          console.log(`[Chat Socket] sendMessage ignored (missing data) from ${socket.id}`);
          return;
        }

        const message = await chatService.sendMessage(chatId, senderId, content);
        
        const chat = await chatService.validateChatAccess(chatId, senderId);

        notificationService.createMessageNotifications(
          chatId,
          message,
          senderId,
          chat.members
        ).catch((err) => console.error("[Chat Socket] Notification error:", err.message));

        io.to(chatId).emit(SOCKET_EVENTS.NEW_MESSAGE, message);

        console.log(`[Chat Socket] Message sent in chat "${chatId}" by ${senderId}`);
      } catch (error) {
        console.error(`[Chat Socket] Error sending message:`, error.message);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Chat Socket] Disconnected: ${socket.id} (${reason})`);
    });
  });
};
