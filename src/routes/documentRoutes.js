const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const controller = require("../controllers/documentController");

// ─── Dedicated file storage for the institutional research repository ────────
const uploadsDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "research-documents"
);
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // Unique name — previous files are never overwritten (full version history).
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `doc-${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "application/csv",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

// CSV / ZIP MIME types are inconsistent across browsers — also accept by
// extension so valid research files are never wrongly rejected.
const ALLOWED_EXTS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".ppt", ".pptx",
  ".zip", ".txt", ".jpg", ".jpeg", ".png", ".gif", ".webp",
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIMES.has(file.mimetype) || ALLOWED_EXTS.has(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Unsupported file type. Allowed: PDF, DOCX, XLSX, CSV, PPTX, ZIP, images."
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Run multer and translate its errors into clean 400 responses.
function uploadFile(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "File exceeds the 25 MB limit."
          : err.message || "File upload failed.";
      return res.status(400).json({ success: false, message });
    }
    next();
  });
}

// ─── Routes — Admin Documents repository (admin-only) ────────────────────────
const router = express.Router();

// Test route — no auth required
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Documents routes working" });
});

router.use(protect);
router.use(strictRoleMiddleware(["admin"]));

// Static / specific paths first so they are not captured by "/:id".
router.post("/upload", uploadFile, controller.uploadDocument);
router.get("/search", controller.searchDocuments);
router.get("/meta", controller.getMeta);
router.get("/project/:projectId", controller.getProjectDocuments);
router.get("/", controller.listDocuments);

router.post("/:id/version", uploadFile, controller.uploadVersion);
router.get("/:id/versions", controller.getVersions);
router.get("/:id", controller.getDocument);
router.patch("/:id", controller.updateDocument);
router.delete("/:id", controller.deleteDocument);

module.exports = router;
