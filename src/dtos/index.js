const { toUserDTO } = require("./userDto");
const { toProjectDTO, toProjectSummaryDTO } = require("./projectDto");
const { toTaskDTO } = require("./taskDto");
const { toProgressDTO } = require("./progressDto");
const { 
  toDocumentDTO, 
  toDocumentSummaryDTO, 
  toDocumentVersionDTO,
  toDocumentWithVersionsDTO 
} = require("./documentDto");
const { 
  toInvitationDTO, 
  toInvitationSummaryDTO, 
  toInvitationCreateResponseDTO 
} = require("./invitationDto");
const { 
  toChatDTO, 
  toChatSummaryDTO, 
  toMessageDTO, 
  toMessageWithChatDTO 
} = require("./chatDto");
const { 
  toNotificationDTO, 
  toNotificationSummaryDTO, 
  toUnreadCountDTO 
} = require("./notificationDto");
const { 
  toEventDTO, 
  toEventSummaryDTO 
} = require("./eventDto");

module.exports = {
  toUserDTO,
  toProjectDTO,
  toProjectSummaryDTO,
  toTaskDTO,
  toProgressDTO,
  toDocumentDTO,
  toDocumentSummaryDTO,
  toDocumentVersionDTO,
  toDocumentWithVersionsDTO,
  toInvitationDTO,
  toInvitationSummaryDTO,
  toInvitationCreateResponseDTO,
  toChatDTO,
  toChatSummaryDTO,
  toMessageDTO,
  toMessageWithChatDTO,
  toNotificationDTO,
  toNotificationSummaryDTO,
  toUnreadCountDTO,
  toEventDTO,
  toEventSummaryDTO,
};
