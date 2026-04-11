const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  uploadDocument,
  getDocumentsByProject,
} = require("../controllers/documentController");

const router = express.Router();

router.post("/", authMiddleware, uploadDocument);
router.get("/project/:projectId", authMiddleware, getDocumentsByProject);

module.exports = router;
