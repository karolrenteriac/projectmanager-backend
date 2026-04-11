/**
 * Emit a Socket.io event to all sockets in a project room.
 * @param {import("express").Application} app
 * @param {string|import("mongoose").Types.ObjectId} projectId
 * @param {string} event
 * @param {object} payload
 */
function emitProjectEvent(app, projectId, event, payload) {
  const io = app.get("io");
  if (!io) return;
  io.to(String(projectId)).emit(event, payload);
}

module.exports = emitProjectEvent;
