const Event = require("../models/event");
const Task = require("../models/task");
const Project = require("../models/project");
const { AppError } = require("../errors/AppError");
const { getPaginationParams, createPaginatedResponse } = require("../utils/pagination");

async function createEvent(title, description, startDate, endDate, projectId, taskId, createdBy, participants, location, isAllDay, type) {
  if (!title || !startDate || !endDate || !createdBy || !projectId) {
    throw new AppError(400, "Title, start date, end date, created by, and project ID are required.");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError(404, "Project not found.");
  }

  const isProjectMember = project.members.some(
    member => member._id.toString() === createdBy
  ) || project.createdBy.toString() === createdBy;

  if (!isProjectMember) {
    throw new AppError(403, "Access denied. You are not a member of this project.");
  }

  if (taskId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError(404, "Task not found.");
    }
  }

  const event = await Event.create({
    title: title.trim(),
    description: description?.trim(),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    project: projectId,
    task: taskId || undefined,
    createdBy,
    participants: participants || [],
    location: location?.trim(),
    isAllDay: isAllDay || false,
    type: type || "MEETING",
  });

  if (taskId) {
    await Task.findByIdAndUpdate(taskId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }

  return await Event.findById(event._id)
    .populate('createdBy', 'name email')
    .populate('project', 'name')
    .populate('task', 'title')
    .populate('participants', 'name email');
}

async function getEvents(userId, page = 1, limit = 20, filters = {}) {
  if (!userId) {
    throw new AppError(400, "User ID is required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });

  let query = {
    $or: [
      { createdBy: userId },
      { participants: userId }
    ]
  };

  if (filters.projectId) {
    query.project = filters.projectId;
  }

  if (filters.dateFrom && filters.dateTo) {
    query.$and = [
      { startDate: { $gte: new Date(filters.dateFrom) } },
      { endDate: { $lte: new Date(filters.dateTo) } }
    ];
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  const events = await Event.find(query)
    .populate('createdBy', 'name email')
    .populate('project', 'name')
    .populate('task', 'title')
    .populate('participants', 'name email')
    .sort({ startDate: 1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await Event.countDocuments(query);

  return createPaginatedResponse(events, total, page, validatedLimit);
}

async function getEventById(eventId, userId) {
  if (!eventId) {
    throw new AppError(400, "Event ID is required.");
  }

  const event = await Event.findById(eventId)
    .populate('createdBy', 'name email')
    .populate('project', 'name members createdBy')
    .populate('task', 'title')
    .populate('participants', 'name email');

  if (!event) {
    throw new AppError(404, "Event not found.");
  }

  const isProjectMember = event.project.members.some(
    member => member._id.toString() === userId
  ) || event.project.createdBy.toString() === userId;

  const isParticipant = event.participants.some(
    participant => participant._id.toString() === userId
  ) || event.createdBy.toString() === userId;

  if (!isProjectMember && !isParticipant) {
    throw new AppError(403, "Access denied. You don't have access to this event.");
  }

  return event;
}

async function updateEvent(eventId, userId, updates) {
  if (!eventId) {
    throw new AppError(400, "Event ID is required.");
  }

  const event = await Event.findById(eventId).populate('project');
  if (!event) {
    throw new AppError(404, "Event not found.");
  }

  const isProjectMember = event.project.members.some(
    member => member._id.toString() === userId
  ) || event.project.createdBy.toString() === userId;

  const isCreator = event.createdBy.toString() === userId;

  if (!isProjectMember && !isCreator) {
    throw new AppError(403, "Access denied. You can only update events you created or participate in.");
  }

  const allowedUpdates = ['title', 'description', 'startDate', 'endDate', 'location', 'isAllDay', 'type', 'status', 'participants'];
  const updateData = {};

  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      if (field === 'startDate' || field === 'endDate') {
        updateData[field] = new Date(updates[field]);
      } else {
        updateData[field] = updates[field];
      }
    }
  });

  const updatedEvent = await Event.findByIdAndUpdate(
    eventId,
    updateData,
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email')
   .populate('project', 'name')
   .populate('task', 'title')
   .populate('participants', 'name email');

  if (event.task && (updates.startDate || updates.endDate)) {
    await Task.findByIdAndUpdate(event.task._id, {
      ...(updates.startDate && { startDate: new Date(updates.startDate) }),
      ...(updates.endDate && { endDate: new Date(updates.endDate) }),
    });
  }

  return updatedEvent;
}

async function deleteEvent(eventId, userId) {
  if (!eventId) {
    throw new AppError(400, "Event ID is required.");
  }

  const event = await Event.findById(eventId).populate('project');
  if (!event) {
    throw new AppError(404, "Event not found.");
  }

  const isCreator = event.createdBy.toString() === userId;

  if (!isCreator) {
    throw new AppError(403, "Access denied. Only event creators can delete events.");
  }

  await Event.findByIdAndDelete(eventId);

  return { message: "Event deleted successfully." };
}

async function getProjectEvents(projectId, userId, page = 1, limit = 20) {
  if (!projectId) {
    throw new AppError(400, "Project ID is required.");
  }

  const project = await Project.findById(projectId).populate('members createdBy');
  if (!project) {
    throw new AppError(404, "Project not found.");
  }

  const isProjectMember = project.members.some(
    member => member._id.toString() === userId
  ) || project.createdBy.toString() === userId;

  if (!isProjectMember) {
    throw new AppError(403, "Access denied. You are not a member of this project.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });

  const events = await Event.find({ project: projectId })
    .populate('createdBy', 'name email')
    .populate('task', 'title')
    .populate('participants', 'name email')
    .sort({ startDate: 1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await Event.countDocuments({ project: projectId });

  return createPaginatedResponse(events, total, page, validatedLimit);
}

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getProjectEvents,
};
