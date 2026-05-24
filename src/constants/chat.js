const CHAT_TYPES = {
  PROJECT: "PROJECT",
  TASK: "TASK",
  TEAM: "TEAM",
  DIRECT: "DIRECT"
};

const SOCKET_EVENTS = {
  JOIN_CHAT: "joinChat",
  LEAVE_CHAT: "leaveChat",
  SEND_MESSAGE: "sendMessage",
  NEW_MESSAGE: "newMessage",
  NOTIFICATION: "notification",
  NEW_NOTIFICATION: "new-notification",
  NOTIFICATION_COUNT: "notification-count",
  USER_CONNECTED: "userConnected",
  USER_DISCONNECTED: "userDisconnected"
};

const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100
};

/**
 * Role-based direct messaging permission matrix.
 *
 * Maps each role to the set of roles it may open a direct conversation with.
 * The Admin role is institutional/governance-oriented: researchers must never
 * communicate directly with Admin — only Coordinators may.
 *
 * The matrix is intentionally symmetric: if role A may message role B, then
 * role B may message role A.
 */
const DIRECT_MESSAGE_MATRIX = {
  admin: ["coordinator"],
  coordinator: ["admin", "principal", "co-researcher"],
  principal: ["coordinator", "co-researcher"],
  "co-researcher": ["principal", "coordinator"]
};

/**
 * Returns the list of roles a given role is allowed to direct-message.
 * @param {string} role
 * @returns {string[]}
 */
function getMessageableRoles(role) {
  return DIRECT_MESSAGE_MATRIX[role] || [];
}

/**
 * Whether a user with senderRole may direct-message a user with receiverRole.
 * @param {string} senderRole
 * @param {string} receiverRole
 * @returns {boolean}
 */
function canDirectMessage(senderRole, receiverRole) {
  return getMessageableRoles(senderRole).includes(receiverRole);
}

module.exports = {
  CHAT_TYPES,
  SOCKET_EVENTS,
  PAGINATION_DEFAULTS,
  DIRECT_MESSAGE_MATRIX,
  getMessageableRoles,
  canDirectMessage
};
