const mongoose = require("mongoose");
const Project = require("../models/project");
const { AppError } = require("../errors/AppError");
const { toProjectDTO } = require("../dtos/projectDto");
const { userCanAccessProject, userOwnsProject } = require("../utils/projectAccess");
const activityLogService = require("./activityLogService");
const { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES } = require("../constants/activity");

const populateOptions = [
  { path: "createdBy", select: "name email role" },
  { path: "members", select: "name email role" },
];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * @param {import("mongoose").Document} project
 * @param {string} userIdStr
 * @param {{ role: string }} actor
 */
function canViewProject(project, userIdStr, actor) {
  if (actor.role === "admin") return true;
  return userCanAccessProject(project, userIdStr);
}

/**
 * @param {{ role: string }} actor
 */
function assertCanCreateProject(actor) {
  if (actor.role === "admin" || actor.role === "coordinator") return;
  throw new AppError(403, "Access denied");
}

async function createProject(body, actor) {
  assertCanCreateProject(actor);

  const { title, description, objectives, startDate, endDate, status, members } = body || {};

  if (title === undefined || String(title).trim() === "") {
    throw new AppError(400, "Title is required");
  }

  const project = await Project.create({
    title: String(title).trim(),
    description,
    objectives,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    status: status || "planning",
    createdBy: actor.userId,
    members: Array.isArray(members) ? members : [],
  });

  await project.populate(populateOptions);
  
  await activityLogService.logActivity(
    actor.userId,
    ACTIVITY_ACTIONS.CREATE_PROJECT,
    ACTIVITY_ENTITIES.PROJECT,
    project._id,
    { 
      projectName: project.title,
      description: project.description 
    },
    null, // IP address will be set by middleware
    null  // User agent will be set by middleware
  );
  
  return toProjectDTO(project);
}

/**
 * @param {{ userId: string; role: string }} actor
 */
async function getProjects(actor) {
  const userId = actor.userId;
  let projects;
  if (actor.role === "admin") {
    projects = await Project.find({})
      .populate(populateOptions)
      .sort({ updatedAt: -1 });
  } else {
    projects = await Project.find({
      $or: [{ createdBy: userId }, { members: userId }],
    })
      .populate(populateOptions)
      .sort({ updatedAt: -1 });
  }

  return projects.map((p) => toProjectDTO(p));
}

async function getProjectById(projectId, actor) {
  if (!isValidObjectId(projectId)) {
    throw new AppError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId).populate(populateOptions);
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const userIdStr = String(actor.userId);
  if (!canViewProject(project, userIdStr, actor)) {
    throw new AppError(403, "Access denied");
  }

  return toProjectDTO(project);
}

async function updateProject(projectId, body, actor) {
  if (!isValidObjectId(projectId)) {
    throw new AppError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const userIdStr = String(actor.userId);
  if (actor.role !== "admin" && !userOwnsProject(project, userIdStr)) {
    throw new AppError(403, "Access denied");
  }

  const { title, description, objectives, startDate, endDate, status, members } = body || {};

  if (title !== undefined) project.title = String(title).trim();
  if (description !== undefined) project.description = description;
  if (objectives !== undefined) project.objectives = objectives;
  if (startDate !== undefined) project.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) project.endDate = endDate ? new Date(endDate) : null;
  if (status !== undefined) project.status = status;
  if (members !== undefined) {
    project.members = Array.isArray(members) ? members : [];
  }

  await project.save();
  await project.populate(populateOptions);
  return toProjectDTO(project);
}

async function deleteProject(projectId, actor) {
  if (!isValidObjectId(projectId)) {
    throw new AppError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const userIdStr = String(actor.userId);
  if (actor.role !== "admin" && !userOwnsProject(project, userIdStr)) {
    throw new AppError(403, "Access denied");
  }

  await Project.findByIdAndDelete(projectId);
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
