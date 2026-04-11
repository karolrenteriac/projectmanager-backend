const documentsService = require("../services/documentsService");
const activityLogService = require("../services/activityLogService");
const { handleError } = require("../utils/handleError");
const { 
  toDocumentDTO, 
  toDocumentWithVersionsDTO,
  toDocumentVersionDTO 
} = require("../dtos");

const createDocument = async (req, res, next) => {
  try {
    const { name, projectId } = req.body;
    const createdBy = req.user.userId;
    
    if (!req.file) {
      throw new Error("No file uploaded.");
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    const document = await documentsService.createDocument(
      name,
      projectId,
      createdBy,
      fileUrl,
      fileName,
      fileSize,
      mimeType
    );

    await activityLogService.logActivity(
      createdBy,
      "UPLOAD_DOCUMENT",
      "DOCUMENT",
      document._id,
      { documentName: name, version: 1 },
      req.ip,
      req.get('User-Agent')
    );

    return res.status(201).json({
      success: true,
      message: "Document created successfully.",
      data: toDocumentDTO(document),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const uploadDocumentVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const uploadedBy = req.user.userId;
    
    if (!req.file) {
      throw new Error("No file uploaded.");
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    const document = await documentsService.uploadDocumentVersion(
      id,
      uploadedBy,
      fileUrl,
      fileName,
      fileSize,
      mimeType
    );

    await activityLogService.logActivity(
      uploadedBy,
      "UPLOAD_DOCUMENT_VERSION",
      "DOCUMENT",
      document._id,
      { 
        documentName: document.name, 
        newVersion: document.currentVersion 
      },
      req.ip,
      req.get('User-Agent')
    );

    return res.status(201).json({
      success: true,
      message: "Document version uploaded successfully.",
      data: toDocumentDTO(document),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const document = await documentsService.getDocumentWithVersions(id, userId);

    return res.json({
      success: true,
      data: toDocumentWithVersionsDTO(document, document.versions),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getProjectDocuments = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    const result = await documentsService.getProjectDocuments(
      projectId,
      userId,
      parseInt(page),
      parseInt(limit)
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await documentsService.deleteDocument(id, userId);

    await activityLogService.logActivity(
      userId,
      "DELETE_DOCUMENT",
      "DOCUMENT",
      id,
      { documentId: id },
      req.ip,
      req.get('User-Agent')
    );

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getDocumentVersion = async (req, res, next) => {
  try {
    const { id, version } = req.params;
    const userId = req.user.userId;

    const document = await documentsService.getDocumentVersion(
      id,
      version,
      userId
    );

    return res.json({
      success: true,
      data: toDocumentVersionDTO(document),
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  createDocument,
  uploadDocumentVersion,
  getDocument,
  getProjectDocuments,
  deleteDocument,
  getDocumentVersion,
};
