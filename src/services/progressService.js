const Progress = require("../models/Progress");
const { AppError } = require("../errors/AppError");
const { toProgressDTO } = require("../dtos/progressDto");
const { ensureProjectMember } = require("../utils/projectAccess");
const { emitToProjectRoom } = require("../utils/socketEmit");

const progressPopulate = [
  { path: "project", select: "title status" },
  { path: "createdBy", select: "name email role" },
];

async function createProgress(body, actor) {
  const { title, description, project, date } = body || {};
  const userIdStr = String(actor.userId);

  if (title === undefined || String(title).trim() === "") {
    throw new AppError(400, "Title is required");
  }
  if (project === undefined || project === null || String(project).trim() === "") {
    throw new AppError(400, "Project is required");
  }

  const access = await ensureProjectMember(project, userIdStr, actor);
  if (!access.ok) {
    throw new AppError(access.status, access.message);
  }

  const progress = await Progress.create({
    title: String(title).trim(),
    description,
    project,
    createdBy: actor.userId,
    ...(date !== undefined && date !== null && date !== ""
      ? { date: new Date(date) }
      : {}),
  });

  await progress.populate(progressPopulate);

  const dto = toProgressDTO(progress);
  emitToProjectRoom(project, "progressCreated", { progress: dto });

  return dto;
}

async function getProgressByProject(projectId, actor) {
  const userIdStr = String(actor.userId);
  const access = await ensureProjectMember(projectId, userIdStr, actor);
  if (!access.ok) {
    throw new AppError(access.status, access.message);
  }

  const progressList = await Progress.find({ project: projectId })
    .populate(progressPopulate)
    .sort({ date: -1, createdAt: -1 });

  return progressList.map((p) => toProgressDTO(p));
}

module.exports = {
  createProgress,
  getProgressByProject,
};
