const calendarService = require("../services/calendarService");
const activityLogService = require("../services/activityLogService");
const { handleError } = require("../utils/handleError");
const { 
  toEventDTO, 
  toEventSummaryDTO 
} = require("../dtos");
const { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES } = require("../constants/activity");

const createEvent = async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, projectId, taskId, participants, location, isAllDay, type } = req.body;
    const createdBy = req.user.userId;

    const event = await calendarService.createEvent(
      title,
      description,
      startDate,
      endDate,
      projectId,
      taskId,
      createdBy,
      participants,
      location,
      isAllDay,
      type
    );

    await activityLogService.logActivity(
      createdBy,
      ACTIVITY_ACTIONS.CREATE_EVENT,
      ACTIVITY_ENTITIES.EVENT,
      event._id,
      { 
        eventName: title,
        eventStartDate: startDate,
        eventEndDate: endDate,
        projectId
      },
      req.ip,
      req.get('User-Agent')
    );

    return res.status(201).json({
      success: true,
      message: "Event created successfully.",
      data: toEventDTO(event),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, projectId, dateFrom, dateTo, type, status } = req.query;
    const userId = req.user.userId;

    const result = await calendarService.getEvents(
      userId,
      parseInt(page),
      parseInt(limit),
      {
        projectId,
        dateFrom,
        dateTo,
        type,
        status
      }
    );

    return res.json({
      success: true,
      data: {
        items: result.items.map(toEventSummaryDTO),
        pagination: result.pagination
      },
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const event = await calendarService.getEventById(id, userId);

    return res.json({
      success: true,
      data: toEventDTO(event),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    const event = await calendarService.updateEvent(id, userId, updates);

    await activityLogService.logActivity(
      userId,
      ACTIVITY_ACTIONS.UPDATE_EVENT,
      ACTIVITY_ENTITIES.EVENT,
      id,
      { 
        eventName: event.title,
        updatedFields: Object.keys(updates)
      },
      req.ip,
      req.get('User-Agent')
    );

    return res.json({
      success: true,
      message: "Event updated successfully.",
      data: toEventDTO(event),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await calendarService.deleteEvent(id, userId);

    await activityLogService.logActivity(
      userId,
      ACTIVITY_ACTIONS.DELETE_EVENT,
      ACTIVITY_ENTITIES.EVENT,
      id,
      { 
        eventName: 'Deleted Event'
      },
      req.ip,
      req.get('User-Agent')
    );

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getProjectEvents = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    const result = await calendarService.getProjectEvents(
      projectId,
      userId,
      parseInt(page),
      parseInt(limit)
    );

    return res.json({
      success: true,
      data: {
        items: result.items.map(toEventSummaryDTO),
        pagination: result.pagination
      },
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getProjectEvents,
};
