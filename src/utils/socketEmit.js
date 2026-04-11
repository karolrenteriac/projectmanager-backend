const { getIo } = require("../config/io");

/**
 * Broadcast to all sockets in a project room (same id used by joinProject).
 * @param {string|import("mongoose").Types.ObjectId} projectId
 * @param {string} event
 * @param {unknown} payload
 * @param {import("express").Request} [req]
 */
function emitToProjectRoom(projectId, event, payload, req) {
  const io = req?.app?.get("io") ?? getIo();
  if (!io) return;
  io.to(String(projectId)).emit(event, payload);
}

module.exports = { emitToProjectRoom };
