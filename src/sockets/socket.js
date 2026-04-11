const registerChatSocketHandlers = require("./chatSocket");

/**
 * @param {import("socket.io").Server} io
 */
module.exports = function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on("joinProject", (projectId) => {
      const roomId =
        projectId != null && typeof projectId === "object"
          ? projectId.projectId
          : projectId;
      if (roomId == null || String(roomId).trim() === "") {
        console.log(`[Socket] joinProject ignored (missing projectId) from ${socket.id}`);
        return;
      }
      const room = String(roomId);
      socket.join(room);
      console.log(`[Socket] ${socket.id} joined room "${room}"`);
    });

    socket.on("sendMessage", (payload) => {
      const { projectId, message, user } = payload || {};
      if (projectId == null || String(projectId).trim() === "") {
        console.log(`[Socket] sendMessage ignored (missing projectId) from ${socket.id}`);
        return;
      }
      const room = String(projectId);
      const data = { projectId: room, message, user };
      console.log(`[Socket] sendMessage in room "${room}":`, data);
      io.to(room).emit("message", data);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    });
  });

  registerChatSocketHandlers(io);
};
