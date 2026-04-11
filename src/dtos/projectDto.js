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
    createdBy: toUserDTO(p.createdBy),
    members: Array.isArray(p.members) ? p.members.map((m) => toUserDTO(m)) : [],
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
  };
}

module.exports = { toProjectDTO, toProjectSummaryDTO };
