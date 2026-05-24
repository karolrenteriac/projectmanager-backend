const jwt = require("jsonwebtoken");

/**
 * Notification realtime layer.
 *
 * Security model:
 *   Each socket is bound to exactly ONE user room — and ONLY the room of the
 *   user whose JWT it presented. Rooms are never joined from client-supplied
 *   ids, so a user can never subscribe to another user's notification stream.
 *
 * @param {import("socket.io").Server} io
 */
module.exports = function registerNotificationSocket(io) {
  // Best-effort auth middleware — verifies the JWT sent in the handshake and
  // attaches the resolved identity. A missing/invalid token does not reject
  // the connection (chat still works); it simply gets no notification room.
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token || null;

      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId || decoded.id;
        if (userId) {
          socket.user = { userId: String(userId), role: decoded.role || null };
        }
      }
    } catch (err) {
      console.warn("[Notification Socket] token verification failed:", err.message);
    }
    next();
  });

  io.on("connection", (socket) => {
    // Join the authenticated user's private room — the only room a socket may
    // join for notifications. Server-side emits target io.to(userId).
    if (socket.user?.userId) {
      socket.join(socket.user.userId);
      console.log(
        `[Notification Socket] ${socket.id} joined private room for user ${socket.user.userId}`
      );
    }
  });
};
