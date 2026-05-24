/**
 * @param {import("mongoose").Document | { _id?: unknown; id?: string; type?: string; project?: any; task?: any; members?: any[]; createdBy?: any; createdAt?: Date; updatedAt?: Date } | null | undefined} chat
 */
function toChatDTO(chat) {
  if (!chat) return null;

  const id = chat._id != null ? chat._id.toString() : String(chat.id);

  return {
    id,
    _id: id,
    type: chat.type,
    project: chat.project,
    task: chat.task,
    members: chat.members,
    createdBy: chat.createdBy,
    lastMessage: chat.lastMessage ?? null,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}

function toChatSummaryDTO(chat) {
  if (!chat) return null;
  
  const id = chat._id != null ? chat._id.toString() : String(chat.id);
  
  return {
    id,
    type: chat.type,
    project: chat.project,
    task: chat.task,
    memberCount: chat.members ? chat.members.length : 0,
    createdBy: chat.createdBy,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}

/**
 * @param {import("mongoose").Document | { _id?: unknown; id?: string; chat?: any; sender?: any; content?: string; createdAt?: Date; updatedAt?: Date } | null | undefined} message
 */
function toMessageDTO(message) {
  if (!message) return null;

  const id = message._id != null ? message._id.toString() : String(message.id);

  // Normalize chat to a plain string ID regardless of whether it was populated
  const chatId = message.chat?._id?.toString()
    ?? message.chat?.id?.toString()
    ?? message.chat?.toString()
    ?? null;

  // Normalize sender — populated doc or plain object
  const sender = message.sender
    ? {
        _id: (message.sender._id ?? message.sender.id ?? message.sender).toString(),
        name: message.sender.name ?? null,
        email: message.sender.email ?? null,
      }
    : null;

  return {
    id,
    _id: id,
    chat: chatId,
    sender,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

function toMessageWithChatDTO(message) {
  if (!message) return null;
  
  const baseMessage = toMessageDTO(message);
  
  return {
    ...baseMessage,
    chatDetails: message.chat,
  };
}

module.exports = { 
  toChatDTO, 
  toChatSummaryDTO, 
  toMessageDTO, 
  toMessageWithChatDTO 
};
