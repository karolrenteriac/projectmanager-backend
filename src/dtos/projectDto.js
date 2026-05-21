const { toUserDTO } = require("./userDto");

/**
 * @param {import("mongoose").Document | Record<string, unknown> | null | undefined} project
 */
function toProjectDTO(project) {
  if (!project) return null;
  const p = project.toObject ? project.toObject() : project;
  const id = p._id != null ? p._id.toString() : String(p.id);
  return {
    id,
    title: p.title,
    description: p.description,
    objectives: p.objectives,
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.status,
    progress: p.progress || 0,
    organization: p.organization,
    createdBy: toUserDTO(p.createdBy),
    coordinator: toUserDTO(p.coordinator),
    principalResearchers: Array.isArray(p.principalResearchers)
      ? p.principalResearchers.map((m) => toUserDTO(m))
      : [],
    coResearchers: Array.isArray(p.coResearchers)
      ? p.coResearchers.map((m) => toUserDTO(m))
      : [],
    isDeleted: p.isDeleted || false,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * @param {import("mongoose").Document | Record<string, unknown> | null | undefined} project
 */
function toProjectSummaryDTO(project) {
  if (!project) return null;
  const p = project.toObject ? project.toObject() : project;
  return {
    id: p._id != null ? p._id.toString() : String(p.id),
    title: p.title,
    status: p.status,
    progress: p.progress || 0,
  };
}

module.exports = { toProjectDTO, toProjectSummaryDTO };
