/**
 * @param {import("mongoose").Document | { _id?: unknown; id?: string; title?: string; description?: string; startDate?: Date; endDate?: Date; project?: any; task?: any; createdBy?: any; participants?: any[]; location?: string; isAllDay?: boolean; type?: string; status?: string; createdAt?: Date; updatedAt?: Date } | null | undefined} event
 */
function toEventDTO(event) {
  if (!event) return null;
  
  const id = event._id != null ? event._id.toString() : String(event.id);
  
  return {
    id,
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    project: event.project,
    task: event.task,
    createdBy: event.createdBy,
    participants: event.participants,
    location: event.location,
    isAllDay: event.isAllDay,
    type: event.type,
    status: event.status,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function toEventSummaryDTO(event) {
  if (!event) return null;
  
  const id = event._id != null ? event._id.toString() : String(event.id);
  
  return {
    id,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    projectName: event.project?.name,
    taskTitle: event.task?.title,
    participantCount: event.participants ? event.participants.length : 0,
    location: event.location,
    type: event.type,
    status: event.status,
    createdAt: event.createdAt,
  };
}

module.exports = { 
  toEventDTO, 
  toEventSummaryDTO 
};
