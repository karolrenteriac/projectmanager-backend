const mongoose = require("mongoose");
const Task = require("../models/task");
const Project = require("../models/project");
const { AppError } = require("../errors/AppError");
const { toTaskDTO } = require("../dtos/taskDto");
const { ensureProjectMember, refIdString, userOwnsProject } = require("../utils/projectAccess");
const { emitToProjectRoom } = require("../utils/socketEmit");

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

  const task = await Task.create({
    title: String(title).trim(),
    description,
    project,
    assignedTo:
      assignedTo !== undefined && assignedTo !== null && assignedTo !== ""
        ? assignedTo
        : undefined,
    createdBy: actor.userId,
  });

  await task.populate(taskPopulate);

  emitToProjectRoom(project, "taskCreated", { task: toTaskDTO(task) });

  return toTaskDTO(task);
}

async function getTasksByProject(projectId, actor) {
  const userIdStr = String(actor.userId);
  const access = await ensureProjectMember(projectId, userIdStr, actor);
  if (!access.ok) {
    throw new AppError(access.status, access.message);
  }

  const tasks = await Task.find({ project: projectId })
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

  const task = await Task.findById(taskId).populate("assignedTo");
  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const project = await Project.findById(task.project);
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const isAdmin = actor.role === "admin";
  const isCreator = userOwnsProject(project, userIdStr);
  const isAssignee =
    task.assignedTo != null && refIdString(task.assignedTo) === userIdStr;

  if (!isAdmin && !isCreator && !isAssignee) {
    throw new AppError(403, "Access denied");
  }

  task.status = status;
  await task.save();
  await task.populate(taskPopulate);

  const projectId = task.project._id ? task.project._id : task.project;
  const dto = toTaskDTO(task);
  emitToProjectRoom(projectId, "taskUpdated", { task: dto });

  return dto;
}

module.exports = {
  createTask,
  getTasksByProject,
  updateTaskStatus,
};
