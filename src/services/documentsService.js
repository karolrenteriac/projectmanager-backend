const Document = require("../models/document");
const DocumentVersion = require("../models/documentVersion");
const Project = require("../models/project");
const { AppError } = require("../errors/AppError");
const { getPaginationParams, createPaginatedResponse } = require("../utils/pagination");

async function createDocument(name, projectId, createdBy, fileUrl, fileName, fileSize, mimeType) {
  if (!name || !projectId || !createdBy || !fileUrl) {
    throw new AppError(400, "Name, project ID, created by, and file URL are required.");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError(404, "Project not found.");
  }

  const document = await Document.create({
    name: name.trim(),
    project: projectId,
    createdBy,
    currentVersion: 1,
  });

  await DocumentVersion.create({
    document: document._id,
    fileUrl,
    version: 1,
    uploadedBy: createdBy,
    fileName,
    fileSize,
    mimeType,
  });

  return await Document.findById(document._id)
    .populate('createdBy', 'name email')
    .populate('project', 'name');
}

async function uploadDocumentVersion(documentId, uploadedBy, fileUrl, fileName, fileSize, mimeType) {
  if (!documentId || !uploadedBy || !fileUrl) {
    throw new AppError(400, "Document ID, uploaded by, and file URL are required.");
  }

  const document = await Document.findById(documentId);
  if (!document) {
    throw new AppError(404, "Document not found.");
  }

  const newVersion = document.currentVersion + 1;

  await DocumentVersion.create({
    document: documentId,
    fileUrl,
    version: newVersion,
    uploadedBy,
    fileName,
    fileSize,
    mimeType,
  });

  document.currentVersion = newVersion;
  await document.save();

  return await Document.findById(documentId)
    .populate('createdBy', 'name email')
    .populate('project', 'name');
}

async function getDocumentWithVersions(documentId, userId) {
  if (!documentId) {
    throw new AppError(400, "Document ID is required.");
  }

  const document = await Document.findById(documentId)
    .populate('createdBy', 'name email')
    .populate('project', 'name members');

  if (!document) {
    throw new AppError(404, "Document not found.");
  }

  const isProjectMember = document.project.members.some(
    member => member._id.toString() === userId
  ) || document.project.createdBy.toString() === userId;

  if (!isProjectMember) {
    throw new AppError(403, "Access denied. You are not a member of this project.");
  }

  const versions = await DocumentVersion.find({ document: documentId })
    .populate('uploadedBy', 'name email')
    .sort({ version: -1 });

  return {
    ...document.toObject(),
    versions,
  };
}

async function getProjectDocuments(projectId, userId, page = 1, limit = 20) {
  if (!projectId) {
    throw new AppError(400, "Project ID is required.");
  }

  const project = await Project.findById(projectId).populate('members');
  if (!project) {
    throw new AppError(404, "Project not found.");
  }

  const isProjectMember = project.members.some(
    member => member._id.toString() === userId
  ) || project.createdBy.toString() === userId;

  if (!isProjectMember) {
    throw new AppError(403, "Access denied. You are not a member of this project.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });

  const documents = await Document.find({ project: projectId })
    .populate('createdBy', 'name email')
    .populate('project', 'name')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await Document.countDocuments({ project: projectId });

  return createPaginatedResponse(documents, total, page, validatedLimit);
}

async function deleteDocument(documentId, userId) {
  if (!documentId) {
    throw new AppError(400, "Document ID is required.");
  }

  const document = await Document.findById(documentId).populate('project');
  if (!document) {
    throw new AppError(404, "Document not found.");
  }

  const isProjectOwner = document.project.createdBy.toString() === userId;
  const isDocumentCreator = document.createdBy.toString() === userId;

  if (!isProjectOwner && !isDocumentCreator) {
    throw new AppError(403, "Access denied. Only project owner or document creator can delete documents.");
  }

  await DocumentVersion.deleteMany({ document: documentId });
  await Document.findByIdAndDelete(documentId);

  return { message: "Document and all versions deleted successfully." };
}

async function getDocumentVersion(documentId, version, userId) {
  if (!documentId || !version) {
    throw new AppError(400, "Document ID and version are required.");
  }

  const document = await Document.findById(documentId)
    .populate('project', 'members createdBy');

  if (!document) {
    throw new AppError(404, "Document not found.");
  }

  const isProjectMember = document.project.members.some(
    member => member._id.toString() === userId
  ) || document.project.createdBy.toString() === userId;

  if (!isProjectMember) {
    throw new AppError(403, "Access denied. You are not a member of this project.");
  }

  const documentVersion = await DocumentVersion.findOne({
    document: documentId,
    version: parseInt(version),
  }).populate('uploadedBy', 'name email');

  if (!documentVersion) {
    throw new AppError(404, "Document version not found.");
  }

  return documentVersion;
}

module.exports = {
  createDocument,
  uploadDocumentVersion,
  getDocumentWithVersions,
  getProjectDocuments,
  deleteDocument,
  getDocumentVersion,
};
