const mongoose = require("mongoose");
const Project = require("../models/project");
const ProjectMember = require("../models/projectMember");
const Task = require("../models/Task");
const User = require("../models/user");
const { AppError } = require("../errors/AppError");
const { toProjectDTO } = require("../dtos/projectDto");
const { emitToProjectRoom } = require("../utils/socketEmit");
const activityLogService = require("./activityLogService");
const { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES } = require("../constants/activity");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const populateOptions = [
  { path: "createdBy", select: "name email role" },
  { path: "projectCoordinator", select: "name email role" },
  { path: "principalResearchers", select: "name email role" },
  { path: "coResearchers", select: "name email role" },
];

// ─── Permission Helpers ────────────────────────────────────────────────────

function assertAdminOnly(actor) {
  if (actor.role !== "admin") {
    throw new AppError(403, "Only admins can perform this action on projects");
  }
}

function deduplicateIds(ids) {
  if (!Array.isArray(ids)) return [];
  const valid = ids.filter((id) => isValidObjectId(id));
  return [...new Set(valid.map(String))];
}

// ─── Validate team members by expected role ────────────────────────────────

async function validateUsersByRole(ids, expectedRole, orgId, fieldLabel) {
  if (ids.length === 0) return;
  const users = await User.find({
    _id: { $in: ids },
    organization: orgId,
    isDeleted: false,
  }).select("name role");
  if (users.length !== ids.length) {
    throw new AppError(400, `Some ${fieldLabel} do not belong to your organization or are deleted`);
  }
  const wrongRole = users.filter((u) => u.role !== expectedRole);
  if (wrongRole.length > 0) {
    throw new AppError(
      400,
      `${fieldLabel} must have role '${expectedRole}'. Invalid: ${wrongRole.map((u) => u.name).join(", ")}`
    );
  }
}

// ─── Sync ProjectMember records ────────────────────────────────────────────

async function syncProjectMembers(projectId, orgId, coordinatorId, principalIds, coResearcherIds) {
  await ProjectMember.deleteMany({ project: projectId });

  const entries = [];

  if (coordinatorId) {
    entries.push({ user: coordinatorId, project: projectId, role: "COORDINATOR", organization: orgId });
  }
  for (const uid of principalIds) {
    entries.push({ user: uid, project: projectId, role: "PRINCIPAL", organization: orgId });
  }
  for (const uid of coResearcherIds) {
    entries.push({ user: uid, project: projectId, role: "CORESEARCHER", organization: orgId });
  }

  if (entries.length > 0) {
    await ProjectMember.insertMany(entries);
  }
}

// ─── createProject ─────────────────────────────────────────────────────────

async function createProject(body, actor) {
  if (!actor) throw new AppError(401, "User is not authenticated");
  assertAdminOnly(actor);

  const {
    title,
    description,
    objectives,
    startDate,
    endDate,
    status,
    projectCoordinator,
    principalResearchers,
    coResearchers,
  } = body || {};

  if (!title || String(title).trim() === "") {
    throw new AppError(400, "Project title is required");
  }

  if (!actor.organization) {
    const user = await User.findById(actor.userId || actor.id);
    if (!user || !user.organization) {
      throw new AppError(400, "User must belong to an organization to create projects");
    }
    actor.organization = user.organization;
  }

  const orgId = actor.organization;

  // ── Validate coordinator ─────────────────────────────────────────────────
  if (!projectCoordinator) {
    throw new AppError(400, "A project coordinator must be assigned");
  }
  if (!isValidObjectId(projectCoordinator)) {
    throw new AppError(400, "Invalid projectCoordinator ID");
  }
  const coordUser = await User.findOne({ _id: projectCoordinator, organization: orgId, isDeleted: false });
  if (!coordUser) throw new AppError(400, "Project coordinator not found in your organization");
  if (coordUser.role !== "coordinator") {
    throw new AppError(400, "The assigned project coordinator must have the 'coordinator' role");
  }

  // ── Validate principalResearchers ────────────────────────────────────────
  const cleanedPrincipals = deduplicateIds(principalResearchers);
  if (cleanedPrincipals.length === 0) {
    throw new AppError(400, "At least one principal researcher must be assigned");
  }
  await validateUsersByRole(cleanedPrincipals, "principal", orgId, "Principal Researchers");

  // ── Validate coResearchers (optional) ────────────────────────────────────
  const cleanedCoResearchers = deduplicateIds(coResearchers);
  if (cleanedCoResearchers.length > 0) {
    await validateUsersByRole(cleanedCoResearchers, "co-researcher", orgId, "Co-Researchers");
  }

  const project = await Project.create({
    title: String(title).trim(),
    description,
    objectives,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    status: status || "planning",
    progress: 0,
    organization: orgId,
    createdBy: actor.userId,
    projectCoordinator,
    principalResearchers: cleanedPrincipals,
    coResearchers: cleanedCoResearchers,
  });

  await syncProjectMembers(project._id, orgId, projectCoordinator, cleanedPrincipals, cleanedCoResearchers);
  await project.populate(populateOptions);

  activityLogService
    .logActivity(
      actor.userId,
      ACTIVITY_ACTIONS.CREATE_PROJECT,
      ACTIVITY_ENTITIES.PROJECT,
      project._id,
      orgId,
      { projectName: project.title, coordinatorId: projectCoordinator },
      null, null, null,
      { title: project.title, status: project.status, projectCoordinator }
    )
    .catch((err) => console.error("Activity Log Error:", err));

  return toProjectDTO(project);
}

// ─── getProjects ───────────────────────────────────────────────────────────

async function getProjects(actor, search) {
  if (!actor.organization) throw new AppError(400, "Organization context missing");

  const baseFilter = { organization: actor.organization, isDeleted: false };

  if (search && String(search).trim() !== "") {
    const sanitized = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    baseFilter.$or = [
      { title: { $regex: sanitized, $options: "i" } },
      { description: { $regex: sanitized, $options: "i" } },
    ];
  }

  let projects;

  if (actor.role === "admin") {
    projects = await Project.find(baseFilter).populate(populateOptions).sort({ updatedAt: -1 });
  } else if (actor.role === "coordinator") {
    projects = await Project.find({ ...baseFilter, projectCoordinator: actor.userId })
      .populate(populateOptions)
      .sort({ updatedAt: -1 });
  } else if (actor.role === "principal") {
    projects = await Project.find({ ...baseFilter, principalResearchers: actor.userId })
      .populate(populateOptions)
      .sort({ updatedAt: -1 });
  } else {
    // co-researcher
    projects = await Project.find({ ...baseFilter, coResearchers: actor.userId })
      .populate(populateOptions)
      .sort({ updatedAt: -1 });
  }

  return projects.map((p) => toProjectDTO(p));
}

// ─── getProjectById ────────────────────────────────────────────────────────

async function getProjectById(projectId, actor) {
  if (!isValidObjectId(projectId)) throw new AppError(400, "Invalid project ID");

  const project = await Project.findOne({
    _id: projectId,
    organization: actor.organization,
    isDeleted: false,
  }).populate(populateOptions);

  if (!project) throw new AppError(404, "Project not found");

  if (actor.role === "admin") {
    // full access
  } else if (actor.role === "coordinator") {
    const isAssigned =
      project.projectCoordinator &&
      String(project.projectCoordinator._id || project.projectCoordinator) === String(actor.userId);
    if (!isAssigned) throw new AppError(403, "Coordinators can only view projects assigned to them");
  } else if (actor.role === "principal") {
    const isMember = project.principalResearchers.some(
      (m) => String(m._id || m) === String(actor.userId)
    );
    if (!isMember) throw new AppError(403, "You are not a principal researcher on this project");
  } else {
    // co-researcher
    const isMember = project.coResearchers.some(
      (m) => String(m._id || m) === String(actor.userId)
    );
    if (!isMember) throw new AppError(403, "You are not a co-researcher on this project");
  }

  return toProjectDTO(project);
}

// ─── updateProject ─────────────────────────────────────────────────────────

async function updateProject(projectId, body, actor) {
  if (!isValidObjectId(projectId)) throw new AppError(400, "Invalid project ID");
  assertAdminOnly(actor);

  const project = await Project.findOne({
    _id: projectId,
    organization: actor.organization,
    isDeleted: false,
  });
  if (!project) throw new AppError(404, "Project not found");

  const before = {
    title: project.title,
    status: project.status,
    projectCoordinator: project.projectCoordinator,
  };

  const orgId = actor.organization;
  const {
    title,
    description,
    objectives,
    startDate,
    endDate,
    status,
    projectCoordinator,
    principalResearchers,
    coResearchers,
  } = body || {};

  if (title !== undefined) project.title = String(title).trim();
  if (description !== undefined) project.description = description;
  if (objectives !== undefined) project.objectives = objectives;
  if (startDate !== undefined) project.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) project.endDate = endDate ? new Date(endDate) : null;
  if (status !== undefined) project.status = status;

  // Coordinator update
  if (projectCoordinator !== undefined) {
    if (projectCoordinator === null) {
      project.projectCoordinator = null;
    } else {
      if (!isValidObjectId(projectCoordinator)) throw new AppError(400, "Invalid projectCoordinator ID");
      const coordUser = await User.findOne({ _id: projectCoordinator, organization: orgId, isDeleted: false });
      if (!coordUser) throw new AppError(400, "Project coordinator not found in your organization");
      if (coordUser.role !== "coordinator") {
        throw new AppError(400, "The assigned project coordinator must have the 'coordinator' role");
      }
      project.projectCoordinator = projectCoordinator;
    }
  }

  // Principal Researchers update
  if (principalResearchers !== undefined) {
    const cleanedPrincipals = deduplicateIds(principalResearchers);
    if (cleanedPrincipals.length === 0) {
      throw new AppError(400, "At least one principal researcher must be assigned");
    }
    await validateUsersByRole(cleanedPrincipals, "principal", orgId, "Principal Researchers");
    project.principalResearchers = cleanedPrincipals;
  }

  // Co-Researchers update (optional)
  if (coResearchers !== undefined) {
    const cleanedCoResearchers = deduplicateIds(coResearchers);
    if (cleanedCoResearchers.length > 0) {
      await validateUsersByRole(cleanedCoResearchers, "co-researcher", orgId, "Co-Researchers");
    }
    project.coResearchers = cleanedCoResearchers;
  }

  await project.save();

  // Sync ProjectMember table
  await syncProjectMembers(
    projectId,
    orgId,
    project.projectCoordinator,
    project.principalResearchers,
    project.coResearchers
  );

  await project.populate(populateOptions);

  activityLogService
    .logActivity(
      actor.userId,
      ACTIVITY_ACTIONS.UPDATE_PROJECT,
      ACTIVITY_ENTITIES.PROJECT,
      project._id,
      orgId,
      { projectName: project.title },
      null, null,
      before,
      { title: project.title, status: project.status, projectCoordinator: project.projectCoordinator }
    )
    .catch((err) => console.error("Activity Log Error:", err));

  const dto = toProjectDTO(project);
  emitToProjectRoom(projectId, "projectUpdated", {
    type: "projectUpdated",
    projectId: String(projectId),
    actor: { id: actor.userId, name: actor.name, role: actor.role },
    timestamp: new Date().toISOString(),
    data: dto,
  });

  return dto;
}

// ─── softDeleteProject ─────────────────────────────────────────────────────

async function softDeleteProject(projectId, actor) {
  if (!isValidObjectId(projectId)) throw new AppError(400, "Invalid project ID");
  assertAdminOnly(actor);

  const project = await Project.findOne({
    _id: projectId,
    organization: actor.organization,
    isDeleted: false,
  });
  if (!project) throw new AppError(404, "Project not found");

  project.isDeleted = true;
  await project.save();

  await ProjectMember.updateMany({ project: projectId }, { isDeleted: true });

  activityLogService
    .logActivity(
      actor.userId,
      ACTIVITY_ACTIONS.DELETE_PROJECT,
      ACTIVITY_ENTITIES.PROJECT,
      project._id,
      actor.organization,
      { projectName: project.title }
    )
    .catch((err) => console.error("Activity Log Error:", err));

  emitToProjectRoom(projectId, "projectDeleted", {
    type: "projectDeleted",
    projectId: String(projectId),
    actor: { id: actor.userId, name: actor.name, role: actor.role },
    timestamp: new Date().toISOString(),
    data: { projectId: String(projectId) },
  });

  return { message: "Project deleted successfully" };
}

// ─── exportProject ─────────────────────────────────────────────────────────

async function exportProject(projectId, actor) {
  if (!isValidObjectId(projectId)) throw new AppError(400, "Invalid project ID");

  if (!["admin", "coordinator"].includes(actor.role)) {
    throw new AppError(403, "Only admins and coordinators can export projects");
  }

  const project = await Project.findOne({
    _id: projectId,
    organization: actor.organization,
    isDeleted: false,
  }).populate(populateOptions);

  if (!project) throw new AppError(404, "Project not found");

  if (actor.role === "coordinator") {
    const isAssigned =
      project.projectCoordinator &&
      String(project.projectCoordinator._id || project.projectCoordinator) === String(actor.userId);
    if (!isAssigned) throw new AppError(403, "Coordinators can only export projects assigned to them");
  }

  const tasks = await Task.find({ project: projectId, organization: actor.organization, isDeleted: false })
    .populate({ path: "assignedTo", select: "name email role" })
    .populate({ path: "createdBy", select: "name email role" })
    .sort({ createdAt: -1 });

  const projectDTO = toProjectDTO(project);

  const serializeUser = (u) => (u ? { name: u.name, email: u.email, role: u.role } : null);

  return {
    project: projectDTO,
    team: {
      coordinator: serializeUser(project.projectCoordinator),
      principalResearchers: (project.principalResearchers || []).map(serializeUser),
      coResearchers: (project.coResearchers || []).map(serializeUser),
    },
    tasks: tasks.map((t) => {
      const task = t.toObject ? t.toObject() : t;
      return {
        id: task._id?.toString(),
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignedTo: serializeUser(task.assignedTo),
        createdBy: serializeUser(task.createdBy),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };
    }),
    exportedAt: new Date().toISOString(),
  };
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  softDeleteProject,
  exportProject,
};
