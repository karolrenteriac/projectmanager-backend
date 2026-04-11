const Chat = require("../models/chat");
const Message = require("../models/message");
const User = require("../models/user");
const Project = require("../models/project");
const Task = require("../models/task");
const { AppError } = require("../errors/AppError");
const { CHAT_TYPES } = require("../constants");
const { getPaginationParams, createPaginatedResponse } = require("../utils/pagination");

async function createChat(type, projectId, taskId, members, createdBy) {
  if (!type || !createdBy) {
    throw new AppError(400, "Type and createdBy are required.");
  }

  if (!Object.values(CHAT_TYPES).includes(type)) {
    throw new AppError(400, `Type must be one of: ${Object.values(CHAT_TYPES).join(", ")}.`);
  }

  let chatMembers = [...members];

  if (type === CHAT_TYPES.PROJECT) {
    if (!projectId) {
      throw new AppError(400, "Project ID is required for PROJECT chat type.");
    }

    const project = await Project.findById(projectId).populate('members');
    if (!project) {
      throw new AppError(404, "Project not found.");
    }

    chatMembers = [
      ...new Set([
        ...chatMembers,
        ...project.members.map(member => member._id.toString()),
        project.createdBy.toString()
      ])
    ];
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

  const uniqueMembers = [...new Set(chatMembers.map(id => id.toString()))];

  const chat = await Chat.create({
    type,
    project: projectId || undefined,
    task: taskId || undefined,
    members: uniqueMembers,
    createdBy,
  });

  return await Chat.findById(chat._id)
    .populate('members', 'name email')
    .populate('createdBy', 'name email')
    .populate('project', 'name')
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

  const message = await Message.create({
    chat: chatId,
    sender: senderId,
    content: content.trim(),
  });

  return await Message.findById(message._id)
    .populate('sender', 'name email')
    .populate('chat', 'type project task');
}

async function getUserChats(userId, page = 1, limit = 20) {
  if (!userId) {
    throw new AppError(400, "User ID is required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });

  const chats = await Chat.find({ members: userId })
    .populate('members', 'name email')
    .populate('createdBy', 'name email')
    .populate('project', 'name')
    .populate('task', 'title')
    .populate({
      path: 'lastMessage',
      model: 'Message',
      populate: {
        path: 'sender',
        select: 'name email'
      }
    })
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

module.exports = {
  createChat,
  getChatMessages,
  sendMessage,
  getUserChats,
  validateChatAccess,
};
