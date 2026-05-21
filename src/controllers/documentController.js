const documentService = require("../services/documentService");
const { handleError } = require("../utils/handleError");

// POST /api/documents/upload — create a new repository document (version 1).
const uploadDocument = async (req, res, next) => {
  try {
    const document = await documentService.createDocument(
      req.user,
      req.body,
      req.file
    );
    res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      document,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

// POST /api/documents/:id/version — append a new version.
const uploadVersion = async (req, res, next) => {
  try {
    const document = await documentService.addVersion(
      req.user,
      req.params.id,
      req.body,
      req.file
    );
    res.status(201).json({
      success: true,
      message: `Version ${document.currentVersion} uploaded successfully.`,
      document,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/documents — paginated repository list with filters.
const listDocuments = async (req, res, next) => {
  try {
    const data = await documentService.queryDocuments(req.user, req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/documents/search — advanced filtered search.
const searchDocuments = async (req, res, next) => {
  try {
    const data = await documentService.queryDocuments(req.user, req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/documents/project/:projectId — documents for a project.
const getProjectDocuments = async (req, res, next) => {
  try {
    const data = await documentService.getProjectDocuments(
      req.user,
      req.params.projectId,
      req.query
    );
    res.json({ success: true, ...data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/documents/meta — filter & form option lists.
const getMeta = async (req, res, next) => {
  try {
    const data = await documentService.getMeta(req.user);
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/documents/:id — single document with version timeline.
const getDocument = async (req, res, next) => {
  try {
    const document = await documentService.getDocument(req.user, req.params.id);
    res.json({ success: true, document });
  } catch (err) {
    handleError(err, res, next);
  }
};

// GET /api/documents/:id/versions — version history.
const getVersions = async (req, res, next) => {
  try {
    const data = await documentService.getVersions(req.user, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// PATCH /api/documents/:id — update metadata / classification.
const updateDocument = async (req, res, next) => {
  try {
    const document = await documentService.updateDocument(
      req.user,
      req.params.id,
      req.body
    );
    res.json({
      success: true,
      message: "Document updated successfully.",
      document,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

// DELETE /api/documents/:id — soft delete (archive).
const deleteDocument = async (req, res, next) => {
  try {
    const result = await documentService.softDeleteDocument(
      req.user,
      req.params.id
    );
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  uploadDocument,
  uploadVersion,
  listDocuments,
  searchDocuments,
  getProjectDocuments,
  getMeta,
  getDocument,
  getVersions,
  updateDocument,
  deleteDocument,
};
