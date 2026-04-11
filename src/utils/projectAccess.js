const mongoose = require("mongoose");
const Project = require("../models/project");

const refIdString = (ref) => {
  if (!ref) return "";
  return ref._id ? ref._id.toString() : ref.toString();
};

const userOwnsProject = (project, userIdStr) =>
  refIdString(project.createdBy) === userIdStr;

const userCanAccessProject = (project, userIdStr) => {
  if (userOwnsProject(project, userIdStr)) return true;
  return project.members.some((m) => refIdString(m) === userIdStr);
};

/**
 * @param {string} userIdStr
 * @param {import("mongoose").Document|null} project
 * @param {{ role?: string } | undefined} user
 */
function isProjectMember(userIdStr, project, user) {
  if (!project) return false;
  if (user && user.role === "admin") return true;
  return userCanAccessProject(project, userIdStr);
}

/**
 * @returns {Promise<{ ok: true, project: import("mongoose").Document } | { ok: false, status: number, message: string }>}
 */
async function ensureProjectMember(projectId, userIdStr, user) {
  if (!projectId || !mongoose.Types.ObjectId.isValid(String(projectId))) {
    return { ok: false, status: 400, message: "Invalid project id" };
  }
  const project = await Project.findById(projectId);
  if (!project) {
    return { ok: false, status: 404, message: "Project not found" };
  }
  if (isProjectMember(userIdStr, project, user)) {
    return { ok: true, project };
  }
  return { ok: false, status: 403, message: "Not part of this project" };
}

module.exports = {
  ensureProjectMember,
  userCanAccessProject,
  userOwnsProject,
  refIdString,
  isProjectMember,
};
