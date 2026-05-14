const mongoose = require("mongoose");
const Project = require("../models/project");
const ProjectMember = require("../models/projectMember");

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
 * Returns true if the actor has any form of read/write access to the project
 * under the new role architecture:
 *
 *   admin       → always (org-scoped read-only oversight)
 *   coordinator → only if project.projectCoordinator === actor.userId
 *   principal / co-researcher → only if in project.members[]
 */
function isProjectMember(userIdStr, project, user) {
  if (!project) return false;
  if (!user) return false;

  if (user.role === "admin") return true;

  if (user.role === "coordinator") {
    return (
      project.projectCoordinator &&
      refIdString(project.projectCoordinator) === String(userIdStr)
    );
  }

  // principal / co-researcher
  return project.members.some((m) => refIdString(m) === String(userIdStr));
}

/**
 * Resolves project access for an actor, fetching the project document if needed.
 * Returns { ok: true, project } on success or { ok: false, status, message } on failure.
 *
 * @returns {Promise<{ ok: true, project: import("mongoose").Document } | { ok: false, status: number, message: string }>}
 */
async function ensureProjectMember(projectId, userIdStr, user) {
  if (!projectId || !mongoose.Types.ObjectId.isValid(String(projectId))) {
    return { ok: false, status: 400, message: "Invalid project id" };
  }

  const project = await Project.findById(projectId);
  if (!project || project.isDeleted) {
    return { ok: false, status: 404, message: "Project not found" };
  }

  if (isProjectMember(userIdStr, project, user)) {
    return { ok: true, project };
  }

  // Role-specific error messages
  if (user?.role === "coordinator") {
    return {
      ok: false,
      status: 403,
      message: "Coordinators can only access projects assigned to them as project coordinator",
    };
  }

  return { ok: false, status: 403, message: "You are not a member of this project" };
}

module.exports = {
  ensureProjectMember,
  userCanAccessProject,
  userOwnsProject,
  refIdString,
  isProjectMember,
};
