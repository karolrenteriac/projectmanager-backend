const Chat = require("../models/chat");
const Message = require("../models/message");
const User = require("../models/user");
const Project = require("../models/project");
const Task = require("../models/task");
const { AppError } = require("../errors/AppError");
const { CHAT_TYPES, canDirectMessage, getMessageableRoles } = require("../constants");
const { getPaginationParams, createPaginatedResponse } = require("../utils/pagination");

const RESTRICTED_DM_MESSAGE = "Direct communication with this role is restricted.";

/**
 * Resolves and validates the two participants of a DIRECT conversation.
 * Returns the final member id list ([creatorId, recipientId]) or throws.
 *
 * @param {{ _id: any, role: string, organization: any }} creator
 * @param {string[]} members - member ids supplied by the client
 */
async function resolveDirectMembers(creator, members) {
  const creatorId = creator._id.toString();

  const otherMembers = [...new Set((members || []).map((id) => id.toString()))]
    .filter((id) => id !== creatorId);

  if (otherMembers.length !== 1) {
    throw new AppError(400, "A direct conversation requires exactly one other participant.");
  }

  const recipientId = otherMembers[0];
  const recipient = await User.findById(recipientId);

  if (!recipient || recipient.isDeleted) {
    throw new AppError(404, "Recipient user not found.");
  }

  if (
    !creator.organization ||
    !recipient.organization ||
    creator.organization.toString() !== recipient.organization.toString()
  ) {
    throw new AppError(403, "You can only message users within your organization.");
  }

  if (!canDirectMessage(creator.role, recipient.role)) {
    throw new AppError(403, RESTRICTED_DM_MESSAGE);
  }

  return [creatorId, recipientId];
}

/**
 * Re-validates that the role pairing of an existing DIRECT chat is still
 * permitted before a message is delivered. Guards against conversations that
 * were created out-of-band (e.g. crafted requests) or role changes over time.
 *
 * @param {{ members: any[] }} chat
 * @param {string} senderId
 */
async function assertDirectChatAllowed(chat, senderId) {
  const memberIds = chat.members.map((m) => m.toString());
  const members = await User.find({ _id: { $in: memberIds } }).select("role");

  const sender = members.find((m) => m._id.toString() === senderId.toString());
  const recipient = members.find((m) => m._id.toString() !== senderId.toString());

  if (!sender || !recipient) {
    throw new AppError(403, "Direct conversation participants could not be verified.");
  }

  if (!canDirectMessage(sender.role, recipient.role)) {
    throw new AppError(403, RESTRICTED_DM_MESSAGE);
  }
}

async function createChat(type, projectId, taskId, members, createdBy) {
  if (!type || !createdBy) {
    throw new AppError(400, "Type and createdBy are required.");
  }

  if (!Object.values(CHAT_TYPES).includes(type)) {
    throw new AppError(400, `Type must be one of: ${Object.values(CHAT_TYPES).join(", ")}.`);
  }

  const creator = await User.findById(createdBy);
  if (!creator || creator.isDeleted) {
    throw new AppError(404, "Creator user not found.");
  }

  let chatMembers = Array.isArray(members) ? [...members] : [];

  if (type === CHAT_TYPES.PROJECT) {
    if (!projectId) {
      throw new AppError(400, "Project ID is required for PROJECT chat type.");
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, "Project not found.");
    }

    const projectMemberIds = [
      project.coordinator?.toString(),
      ...(project.principalResearchers || []).map(id => id.toString()),
      ...(project.coResearchers || []).map(id => id.toString()),
      project.createdBy?.toString(),
    ].filter(Boolean);

    chatMembers = [...new Set([...chatMembers, ...projectMemberIds])];
  }

  if (type === CHAT_TYPES.TASK) {
    if (!taskId) {
      throw new AppError(400, "Task ID is required for TASK chat type.");
    }

    const task = await Task.findById(taskId).populate('assignedTo');
    if (!task) {
      throw new AppError(404, "Task not found.");
    }

    chatMembers = [
      ...new Set([
        ...chatMembers,
        ...task.assignedTo.map(user => user._id.toString()),
        task.createdBy.toString()
      ])
    ];
  }

  if (type === CHAT_TYPES.TEAM && chatMembers.length === 0) {
    throw new AppError(400, "At least one member is required for TEAM chat type.");
  }

  // DIRECT conversations are strictly role-gated and limited to two participants.
  if (type === CHAT_TYPES.DIRECT) {
    chatMembers = await resolveDirectMembers(creator, chatMembers);
  }

  const uniqueMembers = [...new Set(chatMembers.map(id => id.toString()))];

  const chat = await Chat.create({
    type,
    project: projectId || undefined,
    task: taskId || undefined,
    members: uniqueMembers,
    organization: creator.organization,
    createdBy,
  });

  return await Chat.findById(chat._id)
    .populate('members', 'name email role')
    .populate('createdBy', 'name email')
    .populate('project', 'title')
    .populate('task', 'title');
}

async function getChatMessages(chatId, userId, page = 1, limit = 20) {
  if (!chatId) {
    throw new AppError(400, "Chat ID is required.");
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new AppError(404, "Chat not found.");
  }

  if (!chat.members.includes(userId)) {
    throw new AppError(403, "Access denied. You are not a member of this chat.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });

  const messages = await Message.find({ chat: chatId })
    .populate('sender', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await Message.countDocuments({ chat: chatId });

  return createPaginatedResponse(messages.reverse(), total, page, validatedLimit);
}

async function sendMessage(chatId, senderId, content) {
  if (!chatId || !senderId || !content) {
    throw new AppError(400, "Chat ID, sender ID, and content are required.");
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new AppError(404, "Chat not found.");
  }

  if (!chat.members.includes(senderId)) {
    throw new AppError(403, "Access denied. You are not a member of this chat.");
  }

  // Re-validate role permissions on every send — a DIRECT conversation that
  // exists is not proof that the pairing is (still) allowed.
  if (chat.type === CHAT_TYPES.DIRECT) {
    await assertDirectChatAllowed(chat, senderId);
  }

  const message = await Message.create({
    chat: chatId,
    sender: senderId,
    content: content.trim(),
  });

  // Keep lastMessage pointer current so sidebar previews stay fresh
  await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

  return await Message.findById(message._id)
    .populate('sender', 'name email');
}

async function getUserChats(userId, page = 1, limit = 20) {
  if (!userId) {
    throw new AppError(400, "User ID is required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });

  const chats = await Chat.find({ members: userId, isDeleted: false })
    .populate('members', 'name email role')
    .populate('createdBy', 'name email')
    .populate('project', 'title')
    .populate('task', 'title')
    .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name email' } })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await Chat.countDocuments({ members: userId });

  return createPaginatedResponse(chats, total, page, validatedLimit);
}

async function validateChatAccess(chatId, userId) {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new AppError(404, "Chat not found.");
  }

  if (!chat.members.includes(userId)) {
    throw new AppError(403, "Access denied. You are not a member of this chat.");
  }

  return chat;
}

/**
 * Returns the org users the given user is permitted to direct-message,
 * filtered by the role-based messaging matrix.
 *
 * @param {string} userId
 */
async function getMessageableUsers(userId) {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new AppError(404, "User not found.");
  }

  const allowedRoles = getMessageableRoles(user.role);
  if (allowedRoles.length === 0) {
    return [];
  }

  return User.find({
    organization: user.organization,
    isDeleted: false,
    isActive: true,
    role: { $in: allowedRoles },
    _id: { $ne: user._id },
  })
    .select("_id name email role organization")
    .sort({ name: 1 });
}

/**
 * Returns the number of direct chats where the last message was sent by
 * someone other than the user — a lightweight proxy for unread until
 * per-message read receipts are added.
 *
 * @param {string} userId
 */
async function getUnreadCount(userId) {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) return 0;

  const chats = await Chat.find({ members: userId, isDeleted: false, type: CHAT_TYPES.DIRECT })
    .populate({ path: 'lastMessage', select: 'sender' });

  return chats.reduce((count, chat) => {
    if (!chat.lastMessage) return count;
    const lastSender = chat.lastMessage.sender?.toString();
    return lastSender && lastSender !== userId.toString() ? count + 1 : count;
  }, 0);
}

module.exports = {
  createChat,
  getChatMessages,
  sendMessage,
  getUserChats,
  validateChatAccess,
  getMessageableUsers,
  getUnreadCount,
};
