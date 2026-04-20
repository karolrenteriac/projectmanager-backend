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
 * Asserts permissions for creating projects
 */
function assertCanCreateProject(actor) {
  const allowedRoles = ["admin", "coordinator"];
  if (!allowedRoles.includes(actor.role)) {
    throw new AppError(403, "Only admins or coordinators can create projects");
  }
}

/**
 * Clean and validate members array
 */
function validateMembers(members) {
  if (!Array.isArray(members)) return [];
  // Filter out invalid IDs and ensure unique
  const validMembers = members.filter(id => isValidObjectId(id));
  return [...new Set(validMembers)];
}

async function createProject(body, actor) {
  assertCanCreateProject(actor);

  const { title, description, objectives, startDate, endDate, status, members, role } = body || {};

  if (!title || String(title).trim() === "") {
    throw new AppError(400, "Project title is required");
  }

  // Ensure organization exists
  if (!actor.organization) {
    // Attempt rescue from DB if missing on actor
    const user = await User.findById(actor.userId);
    if (!user || !user.organization) {
      throw new AppError(400, "User must belong to an organization to create projects");
    }
    actor.organization = user.organization;
  }

  const cleanedMembers = validateMembers(members);

  const project = await Project.create({
    title: String(title).trim(),
    description,
    objectives,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    status: status || "planning",
    progress: 0,
    organization: actor.organization,
    createdBy: actor.userId,
    members: cleanedMembers,
  });

  // Create ProjectMember entry for creator
  await ProjectMember.create({
    user: actor.userId,
    project: project._id,
    role: role || "COORDINATOR",
    organization: actor.organization,
  });

  // Create ProjectMember entries for other members
  if (cleanedMembers.length > 0) {
    const memberEntries = cleanedMembers
      .filter(mId => String(mId) !== String(actor.userId)) // Don't duplicate creator
      .map(memberId => ({
        user: memberId,
        project: project._id,
        role: "CORESEARCHER",
        organization: actor.organization,
      }));
    
    if (memberEntries.length > 0) {
      await ProjectMember.insertMany(memberEntries);
    }
  }

  await project.populate(populateOptions);
  
  // Async log (don't block response)
  activityLogService.logActivity(
    actor.userId,
    ACTIVITY_ACTIONS.CREATE_PROJECT,
    ACTIVITY_ENTITIES.PROJECT,
    project._id,
    actor.organization,
    { projectName: project.title },
    null,
    null,
    null,
    { title: project.title, status: project.status }
  ).catch(err => console.error("Activity Log Error:", err));
  
  return toProjectDTO(project);
}

async function getProjects(actor) {
  if (!actor.organization) {
    throw new AppError(400, "Organization context missing");
  }

  let projects;
  if (actor.role === "admin") {
    projects = await Project.find({ 
      organization: actor.organization,
      isDeleted: false 
    })
      .populate(populateOptions)
      .sort({ updatedAt: -1 });
  } else {
    // Users see projects they belong to
    const myProjectIds = await ProjectMember.find({ 
      user: actor.userId, 
      organization: actor.organization,
      isDeleted: false 
    }).distinct("project");
    
    projects = await Project.find({
      _id: { $in: myProjectIds },
      organization: actor.organization,
      isDeleted: false,
    })
      .populate(populateOptions)
      .sort({ updatedAt: -1 });
  }

  return projects.map((p) => toProjectDTO(p));
}

async function getProjectById(projectId, actor) {
  if (!isValidObjectId(projectId)) {
    throw new AppError(400, "Invalid project ID");
  }

  const project = await Project.findOne({
    _id: projectId,
    organization: actor.organization,
    isDeleted: false,
  }).populate(populateOptions);
  
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  // Check access using ProjectMember
  const isMember = await ProjectMember.exists({
    user: actor.userId,
    project: projectId,
    isDeleted: false,
  });

  if (actor.role !== "admin" && !isMember) {
    throw new AppError(403, "You do not have access to this project");
  }

  return toProjectDTO(project);
}

async function updateProject(projectId, body, actor) {
  if (!isValidObjectId(projectId)) {
    throw new AppError(400, "Invalid project ID");
  }

  const project = await Project.findOne({
    _id: projectId,
    organization: actor.organization,
    isDeleted: false,
  });
  
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  // Authorization: Only admin or project owner (creator) can edit core project info
  const isOwner = String(project.createdBy) === String(actor.userId);
  if (actor.role !== "admin" && !isOwner) {
    throw new AppError(403, "Only the project creator or admin can update this project");
  }

  const beforeData = { title: project.title, status: project.status };
  const { title, description, objectives, startDate, endDate, status, members } = body || {};

  if (title !== undefined) project.title = String(title).trim();
  if (description !== undefined) project.description = description;
  if (objectives !== undefined) project.objectives = objectives;
  if (startDate !== undefined) project.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) project.endDate = endDate ? new Date(endDate) : null;
  if (status !== undefined) project.status = status;
  
  if (members !== undefined) {
    const cleanedMembers = validateMembers(members);
    project.members = cleanedMembers;
    
    // Sync ProjectMember model for new members
    // This is a simplified version, ideally you diff them
    // For now, let's keep members synced with the array
  }

  await project.save();
  await project.populate(populateOptions);

  activityLogService.logActivity(
    actor.userId,
    ACTIVITY_ACTIONS.UPDATE_PROJECT,
    ACTIVITY_ENTITIES.PROJECT,
    project._id,
    actor.organization,
    { projectName: project.title },
    null,
    null,
    beforeData,
    { title: project.title, status: project.status }
  ).catch(err => console.error("Activity Log Error:", err));

  const dto = toProjectDTO(project);
  emitToProjectRoom(projectId, "projectUpdated", { project: dto });

  return dto;
}

async function softDeleteProject(projectId, actor) {
  if (!isValidObjectId(projectId)) {
    throw new AppError(400, "Invalid project ID");
  }

  const project = await Project.findOne({
    _id: projectId,
    organization: actor.organization,
    isDeleted: false,
  });
  
  if (!project) {
    throw new AppError(404, "Project not found");
  }

  if (actor.role !== "admin" && String(project.createdBy) !== String(actor.userId)) {
    throw new AppError(403, "Access denied");
  }

  project.isDeleted = true;
  await project.save();

  await ProjectMember.updateMany(
    { project: projectId },
    { isDeleted: true }
  );

  activityLogService.logActivity(
    actor.userId,
    ACTIVITY_ACTIONS.DELETE_PROJECT,
    ACTIVITY_ENTITIES.PROJECT,
    project._id,
    actor.organization,
    { projectName: project.title }
  ).catch(err => console.error("Activity Log Error:", err));

  emitToProjectRoom(projectId, "projectDeleted", { projectId });

  return { message: "Project deleted successfully" };
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  softDeleteProject,
};
