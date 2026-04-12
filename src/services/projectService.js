const mongoose = require("mongoose");
const Project = require("../models/project");
const ProjectMember = require("../models/projectMember");
const User = require("../models/user");
const { AppError } = require("../errors/AppError");
const { toProjectDTO } = require("../dtos/projectDto");
const { userCanAccessProject, userOwnsProject } = require("../utils/projectAccess");
const { emitToProjectRoom } = require("../utils/socketEmit");
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

  const { title, description, objectives, startDate, endDate, status, members, role } = body || {};

  if (title === undefined || String(title).trim() === "") {
    throw new AppError(400, "Title is required");
  }

  // Get user's organization
  const user = await User.findById(actor.userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const project = await Project.create({
    title: String(title).trim(),
    description,
    objectives,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    status: status || "planning",
    progress: 0,
    organization: user.organization,
    createdBy: actor.userId,
    members: Array.isArray(members) ? members : [],
  });

  // Create ProjectMember entry for creator with COORDINATOR role
  await ProjectMember.create({
    user: actor.userId,
    project: project._id,
    role: role || "COORDINATOR",
    organization: user.organization,
  });

  // Create ProjectMember entries for other members with CORESEARCHER role
  if (Array.isArray(members) && members.length > 0) {
    const memberEntries = members.map(memberId => ({
      user: memberId,
      project: project._id,
      role: "CORESEARCHER",
      organization: user.organization,
    }));
    await ProjectMember.insertMany(memberEntries);
  }

  await project.populate(populateOptions);
  
  await activityLogService.logActivity(
    actor.userId,
    ACTIVITY_ACTIONS.CREATE_PROJECT,
    ACTIVITY_ENTITIES.PROJECT,
    project._id,
    user.organization,
    { 
      projectName: project.title,
      description: project.description 
    },
    null,
    null,
    null,
    { 
      title: project.title, 
      status: project.status,
      progress: project.progress 
    }
  );
  
  return toProjectDTO(project);
}

/**
 * @param {{ userId: string; role: string }} actor
 */
async function getProjects(actor) {
  const userId = actor.userId;
  
  // Get user's organization
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  let projects;
  if (actor.role === "admin") {
    // Admin sees all projects in their organization
    projects = await Project.find({ 
      organization: user.organization,
      isDeleted: false 
    })
      .populate(populateOptions)
      .sort({ updatedAt: -1 });
  } else {
    // Regular users see projects they are members of in their organization
    const projectMembers = await ProjectMember.find({ 
      user: userId, 
      organization: user.organization,
      isDeleted: false 
    }).distinct("project");
    
    projects = await Project.find({
      _id: { $in: projectMembers },
      organization: user.organization,
      isDeleted: false,
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

  // Get user's organization
  const user = await User.findById(actor.userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const project = await Project.findOne({
    _id: projectId,
    organization: user.organization,
    isDeleted: false,
  }).populate(populateOptions);
  
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  // Check if user is a project member via ProjectMember model
  const isMember = await ProjectMember.exists({
    user: actor.userId,
    project: projectId,
    isDeleted: false,
  });

  const userIdStr = String(actor.userId);
  if (!canViewProject(project, userIdStr, actor) && !isMember) {
    throw new AppError(403, "Access denied");
  }

  return toProjectDTO(project);
}

async function updateProject(projectId, body, actor) {
  if (!isValidObjectId(projectId)) {
    throw new AppError(400, "Invalid project id");
  }

  // Get user's organization
  const user = await User.findById(actor.userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const project = await Project.findOne({
    _id: projectId,
    organization: user.organization,
    isDeleted: false,
  });
  
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const userIdStr = String(actor.userId);
  if (actor.role !== "admin" && !userOwnsProject(project, userIdStr)) {
    throw new AppError(403, "Access denied");
  }

  // Store previous data for activity log
  const beforeData = { 
    title: project.title, 
    status: project.status,
    description: project.description,
    objectives: project.objectives 
  };

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

  // Log activity with before/after
  await activityLogService.logActivity(
    actor.userId,
    ACTIVITY_ACTIONS.UPDATE_PROJECT,
    ACTIVITY_ENTITIES.PROJECT,
    project._id,
    user.organization,
    { projectName: project.title },
    null,
    null,
    beforeData,
    { 
      title: project.title, 
      status: project.status,
      description: project.description,
      objectives: project.objectives 
    }
  );

  // Emit socket event
  emitToProjectRoom(projectId, "projectUpdated", { 
    project: toProjectDTO(project),
    before: beforeData,
    after: { 
      title: project.title, 
      status: project.status,
      description: project.description,
      objectives: project.objectives 
    }
  });

  return toProjectDTO(project);
}

async function softDeleteProject(projectId, actor) {
  if (!isValidObjectId(projectId)) {
    throw new AppError(400, "Invalid project id");
  }

  // Get user's organization
  const user = await User.findById(actor.userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const project = await Project.findOne({
    _id: projectId,
    organization: user.organization,
    isDeleted: false,
  });
  
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const userIdStr = String(actor.userId);
  if (actor.role !== "admin" && !userOwnsProject(project, userIdStr)) {
    throw new AppError(403, "Access denied");
  }

  // Soft delete project
  project.isDeleted = true;
  await project.save();

  // Soft delete all related ProjectMembers
  await ProjectMember.updateMany(
    { project: projectId },
    { isDeleted: true }
  );

  // Log activity
  await activityLogService.logActivity(
    actor.userId,
    ACTIVITY_ACTIONS.DELETE_PROJECT,
    ACTIVITY_ENTITIES.PROJECT,
    project._id,
    user.organization,
    { projectName: project.title },
    null,
    null,
    { title: project.title, status: project.status, isDeleted: false },
    { title: project.title, status: project.status, isDeleted: true }
  );

  // Emit socket event
  emitToProjectRoom(projectId, "projectDeleted", { 
    projectId: projectId,
    deletedBy: actor.userId 
  });

  return { message: "Project deleted successfully" };
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  softDeleteProject,
};
