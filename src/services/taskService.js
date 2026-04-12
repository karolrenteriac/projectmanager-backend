const mongoose = require("mongoose");
const Task = require("../models/task");
const Project = require("../models/project");
const ProjectMember = require("../models/projectMember");
const { AppError } = require("../errors/AppError");
const { toTaskDTO } = require("../dtos/taskDto");
const { ensureProjectMember, refIdString, userOwnsProject } = require("../utils/projectAccess");
const { updateProjectProgress } = require("../utils/projectProgress");
const { emitToProjectRoom } = require("../utils/socketEmit");
const activityLogService = require("./activityLogService");
const { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES } = require("../constants/activity");

const taskPopulate = [
  { path: "assignedTo", select: "name email role" },
  { path: "project", select: "title status" },
  { path: "createdBy", select: "name email role" },
];

const VALID_STATUSES = ["pending", "in-progress", "completed"];

/**
 * @param {{ role: string }} actor
 */
function assertCanCreateTask(actor) {
  if (actor.role === "admin" || actor.role === "coordinator" || actor.role === "principal") {
    return;
  }
  throw new AppError(403, "Access denied");
}

async function createTask(body, actor) {
  assertCanCreateTask(actor);

  const { title, description, project, assignedTo } = body || {};
  const userIdStr = String(actor.userId);

  if (title === undefined || String(title).trim() === "") {
    throw new AppError(400, "Title is required");
  }
  if (project === undefined || project === null || String(project).trim() === "") {
    throw new AppError(400, "Project is required");
  }

  const access = await ensureProjectMember(project, userIdStr, actor);
  if (!access.ok) {
    throw new AppError(access.status, access.message);
  }

  if (assignedTo !== undefined && assignedTo !== null && assignedTo !== "") {
    if (!mongoose.Types.ObjectId.isValid(String(assignedTo))) {
      throw new AppError(400, "Invalid assignedTo id");
    }
  }

  // Get project to inherit organization
  const projectDoc = await Project.findById(project);
  if (!projectDoc) {
    throw new AppError(404, "Project not found");
  }

  const task = await Task.create({
    title: String(title).trim(),
    description,
    project,
    organization: projectDoc.organization,
    assignedTo:
      assignedTo !== undefined && assignedTo !== null && assignedTo !== ""
        ? assignedTo
        : undefined,
    createdBy: actor.userId,
  });

  await task.populate(taskPopulate);

  // Update project progress
  await updateProjectProgress(project);

  // Log activity
  await activityLogService.logActivity(
    actor.userId,
    ACTIVITY_ACTIONS.CREATE_TASK,
    ACTIVITY_ENTITIES.TASK,
    task._id,
    projectDoc.organization,
    { taskTitle: task.title, projectId: project },
    null,
    null,
    null,
    { status: task.status, title: task.title }
  );

  emitToProjectRoom(project, "taskCreated", { task: toTaskDTO(task) });

  return toTaskDTO(task);
}

async function getTasksByProject(projectId, actor) {
  const userIdStr = String(actor.userId);
  const access = await ensureProjectMember(projectId, userIdStr, actor);
  if (!access.ok) {
    throw new AppError(access.status, access.message);
  }

  // Filter by organization and exclude deleted tasks
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const tasks = await Task.find({ 
    project: projectId, 
    organization: project.organization,
    isDeleted: false 
  })
    .populate(taskPopulate)
    .sort({ updatedAt: -1 });

  return tasks.map((t) => toTaskDTO(t));
}

async function updateTaskStatus(taskId, body, actor) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError(400, "Invalid task id");
  }

  const { status } = body || {};
  if (status === undefined || status === null || String(status).trim() === "") {
    throw new AppError(400, "Status is required");
  }
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError(400, `Status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  const userIdStr = String(actor.userId);

  const task = await Task.findOne({ _id: taskId, isDeleted: false }).populate("assignedTo");
  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const project = await Project.findById(task.project);
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  // Check organization access
  if (String(task.organization) !== String(project.organization)) {
    throw new AppError(403, "Access denied - Organization mismatch");
  }

  const isAdmin = actor.role === "admin";
  const isCreator = userOwnsProject(project, userIdStr);
  const isAssignee =
    task.assignedTo != null && refIdString(task.assignedTo) === userIdStr;

  if (!isAdmin && !isCreator && !isAssignee) {
    throw new AppError(403, "Access denied");
  }

  // Store previous status for activity log
  const beforeStatus = task.status;
  const beforeData = { status: beforeStatus, title: task.title };

  task.status = status;
  await task.save();
  await task.populate(taskPopulate);

  // Update project progress
  const newProgress = await updateProjectProgress(task.project);

  // Log activity with before/after
  await activityLogService.logActivity(
    actor.userId,
    ACTIVITY_ACTIONS.UPDATE_TASK,
    ACTIVITY_ENTITIES.TASK,
    task._id,
    task.organization,
    { taskTitle: task.title, projectId: task.project, newProgress },
    null,
    null,
    beforeData,
    { status: task.status, title: task.title }
  );

  const projectId = task.project._id ? task.project._id : task.project;
  const dto = toTaskDTO(task);
  
  // Emit socket events
  emitToProjectRoom(projectId, "taskUpdated", { 
    task: dto,
    before: beforeData,
    after: { status: task.status, title: task.title }
  });
  
  // Emit progress update if status changed to/from completed
  if (beforeStatus !== status) {
    emitToProjectRoom(projectId, "projectProgressUpdated", { 
      projectId: String(projectId),
      progress: newProgress,
      completedTasks: await Task.countDocuments({ project: projectId, status: "completed", isDeleted: false }),
      totalTasks: await Task.countDocuments({ project: projectId, isDeleted: false })
    });
  }

  return dto;
}

async function softDeleteTask(taskId, actor) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError(400, "Invalid task id");
  }

  const userIdStr = String(actor.userId);

  const task = await Task.findOne({ _id: taskId, isDeleted: false }).populate("assignedTo");
  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const project = await Project.findById(task.project);
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const isAdmin = actor.role === "admin";
  const isCreator = userOwnsProject(project, userIdStr);

  if (!isAdmin && !isCreator) {
    throw new AppError(403, "Access denied");
  }

  // Soft delete
  task.isDeleted = true;
  await task.save();

  // Update project progress
  await updateProjectProgress(task.project);

  // Log activity
  await activityLogService.logActivity(
    actor.userId,
    ACTIVITY_ACTIONS.DELETE_TASK,
    ACTIVITY_ENTITIES.TASK,
    task._id,
    task.organization,
    { taskTitle: task.title, projectId: task.project },
    null,
    null,
    { status: task.status, title: task.title, isDeleted: false },
    { status: task.status, title: task.title, isDeleted: true }
  );

  emitToProjectRoom(task.project, "taskDeleted", { 
    taskId: taskId,
    deletedBy: actor.userId 
  });

  return { message: "Task deleted successfully" };
}

module.exports = {
  createTask,
  getTasksByProject,
  updateTaskStatus,
  softDeleteTask,
};
