const Document = require("../models/document");
const { AppError } = require("../errors/AppError");
const { toDocumentDTO } = require("../dtos/documentDto");
const { ensureProjectMember } = require("../utils/projectAccess");
const { emitToProjectRoom } = require("../utils/socketEmit");

const documentPopulate = [
  { path: "project", select: "title status" },
  { path: "uploadedBy", select: "name email role" },
];

async function uploadDocument(body, actor) {
  const { name, fileUrl, project } = body || {};
  const userIdStr = String(actor.userId);

  if (project === undefined || project === null || String(project).trim() === "") {
    throw new AppError(400, "Project is required");
  }
  if (fileUrl === undefined || fileUrl === null || String(fileUrl).trim() === "") {
    throw new AppError(400, "fileUrl is required");
  }

  const access = await ensureProjectMember(project, userIdStr, actor);
  if (!access.ok) {
    throw new AppError(access.status, access.message);
  }

  const document = await Document.create({
    name: name !== undefined && name !== null ? String(name).trim() : undefined,
    fileUrl: String(fileUrl).trim(),
    project,
    uploadedBy: actor.userId,
  });

  await document.populate(documentPopulate);

  const dto = toDocumentDTO(document);
  emitToProjectRoom(project, "documentUploaded", { document: dto });

  return dto;
}

async function getDocumentsByProject(projectId, actor) {
  const userIdStr = String(actor.userId);
  const access = await ensureProjectMember(projectId, userIdStr, actor);
  if (!access.ok) {
    throw new AppError(access.status, access.message);
  }

  const documents = await Document.find({ project: projectId })
    .populate(documentPopulate)
    .sort({ createdAt: -1 });

  return documents.map((d) => toDocumentDTO(d));
}

module.exports = {
  uploadDocument,
  getDocumentsByProject,
};
