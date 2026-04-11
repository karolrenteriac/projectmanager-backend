const documentService = require("../services/documentService");
const { handleError } = require("../utils/handleError");

const uploadDocument = async (req, res, next) => {
  try {
    const document = await documentService.uploadDocument(req.body, req.user);
    return res.status(201).json({
      message: "Document recorded successfully",
      document,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getDocumentsByProject = async (req, res, next) => {
  try {
    const documents = await documentService.getDocumentsByProject(req.params.projectId, req.user);
    return res.json({ documents });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  uploadDocument,
  getDocumentsByProject,
};
