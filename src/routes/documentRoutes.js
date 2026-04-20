const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  uploadDocument,
  getDocumentsByProject,
} = require("../controllers/documentController");

const router = express.Router();

router.post("/", protect, uploadDocument);
router.get("/project/:projectId", protect, getDocumentsByProject);

module.exports = router;
