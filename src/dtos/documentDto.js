const { toUserDTO } = require("./userDto");
const { toProjectSummaryDTO } = require("./projectDto");

/**
 * @param {import("mongoose").Document | { _id?: unknown; id?: string; name?: string; project?: any; createdBy?: any; currentVersion?: number; createdAt?: Date; updatedAt?: Date } | null | undefined} document
 */
function toDocumentDTO(document) {
  if (!document) return null;
  
  const id = document._id != null ? document._id.toString() : String(document.id);
  
  return {
    id,
    name: document.name,
    project: document.project,
    createdBy: document.createdBy,
    currentVersion: document.currentVersion,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toDocumentSummaryDTO(document) {
  if (!document) return null;
  
  const id = document._id != null ? document._id.toString() : String(document.id);
  
  return {
    id,
    name: document.name,
    projectName: document.project?.name,
    currentVersion: document.currentVersion,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

/**
 * @param {import("mongoose").Document | { _id?: unknown; id?: string; document?: any; fileUrl?: string; version?: number; uploadedBy?: any; fileName?: string; fileSize?: number; mimeType?: string; createdAt?: Date; updatedAt?: Date } | null | undefined} version
 */
function toDocumentVersionDTO(version) {
  if (!version) return null;
  
  const id = version._id != null ? version._id.toString() : String(version.id);
  
  return {
    id,
    document: version.document,
    fileUrl: version.fileUrl,
    version: version.version,
    uploadedBy: version.uploadedBy,
    fileName: version.fileName,
    fileSize: version.fileSize,
    mimeType: version.mimeType,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
  };
}

function toDocumentWithVersionsDTO(document, versions) {
  if (!document) return null;
  
  return {
    ...toDocumentDTO(document),
    versions: versions.map(toDocumentVersionDTO),
  };
}

module.exports = { 
  toDocumentDTO, 
  toDocumentSummaryDTO, 
  toDocumentVersionDTO,
  toDocumentWithVersionsDTO
};
