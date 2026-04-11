const { toUserDTO } = require("./userDto");
const { toProjectSummaryDTO } = require("./projectDto");

/**
 * @param {import("mongoose").Document | Record<string, unknown> | null | undefined} progress
 */
function toProgressDTO(progress) {
  if (!progress) return null;
  const p = progress.toObject ? progress.toObject() : progress;
  const projectRef = p.project;
  const project =
    projectRef && typeof projectRef === "object" && projectRef._id
      ? toProjectSummaryDTO(projectRef)
      : projectRef;

  return {
    id: p._id != null ? p._id.toString() : String(p.id),
    title: p.title,
    description: p.description,
    project,
    createdBy: toUserDTO(p.createdBy),
    date: p.date,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

module.exports = { toProgressDTO };
