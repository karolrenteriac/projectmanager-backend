const { toUserDTO } = require("./userDto");
const { toProjectSummaryDTO } = require("./projectDto");

/**
 * @param {import("mongoose").Document | Record<string, unknown> | null | undefined} task
 */
function toTaskDTO(task) {
  if (!task) return null;
  const t = task.toObject ? task.toObject() : task;
  const projectRef = t.project;
  const project =
    projectRef && typeof projectRef === "object" && projectRef._id
      ? toProjectSummaryDTO(projectRef)
      : projectRef;

  return {
    id: t._id != null ? t._id.toString() : String(t.id),
    title: t.title,
    description: t.description,
    status: t.status,
    assignedTo: toUserDTO(t.assignedTo),
    project,
    organization: t.organization,
    createdBy: toUserDTO(t.createdBy),
    isDeleted: t.isDeleted || false,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

module.exports = { toTaskDTO };
