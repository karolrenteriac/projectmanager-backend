const express = require("express");
const { 
  createDocument, 
  uploadDocumentVersion, 
  getDocument, 
  getProjectDocuments, 
  deleteDocument, 
  getDocumentVersion 
} = require("../controllers/documentsController");
const authMiddleware = require("../middleware/authMiddleware");
const { uploadSingle } = require("../middleware/upload");

const router = express.Router();

router.use(authMiddleware);

router.post("/", uploadSingle, createDocument);

router.post("/:id/version", uploadSingle, uploadDocumentVersion);

router.get("/:id", getDocument);

router.get("/project/:projectId", getProjectDocuments);

router.delete("/:id", deleteDocument);

router.get("/:id/version/:version", getDocumentVersion);

module.exports = router;
