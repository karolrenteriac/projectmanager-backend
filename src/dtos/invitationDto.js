/**
 * @param {import("mongoose").Document | { _id?: unknown; id?: string; email?: string; role?: string; token?: string; expiresAt?: Date; used?: boolean; organization?: any; createdBy?: any; createdAt?: Date; updatedAt?: Date } | null | undefined} invitation
 */
function toInvitationDTO(invitation) {
  if (!invitation) return null;
  
  const id = invitation._id != null ? invitation._id.toString() : String(invitation.id);
  
  return {
    id,
    email: invitation.email,
    role: invitation.role,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
    used: invitation.used,
    organization: invitation.organization,
    createdBy: invitation.createdBy,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

function toInvitationSummaryDTO(invitation) {
  if (!invitation) return null;
  
  const id = invitation._id != null ? invitation._id.toString() : String(invitation.id);
  
  return {
    id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    used: invitation.used,
    createdAt: invitation.createdAt,
  };
}

function toInvitationCreateResponseDTO(invitationData) {
  return {
    id: invitationData.id,
    invitationLink: invitationData.invitationLink,
    expiresAt: invitationData.expiresAt,
  };
}

module.exports = { 
  toInvitationDTO, 
  toInvitationSummaryDTO, 
  toInvitationCreateResponseDTO 
};
