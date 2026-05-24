const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  changeMyPassword,
} = require("../controllers/settingsController");

// ── Avatar upload (multer disk storage) ─────────────────────────────────────
const avatarsDir = path.join(__dirname, "../../uploads/avatars");
fs.mkdirSync(avatarsDir, { recursive: true });

const ALLOWED_AVATAR_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const safe = `${req.user.userId}-${Date.now()}${ext}`;
    cb(null, safe);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_AVATAR_MIMES.has(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed"));
  }
  cb(null, true);
};

const avatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// Wrap multer to translate errors into 400 responses
function uploadAvatarMiddleware(req, res, next) {
  avatarUpload.single("avatar")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Avatar must be 2 MB or smaller"
          : err.message || "Avatar upload failed";
      return res.status(400).json({ success: false, message });
    }
    next();
  });
}

// ── Routes ──────────────────────────────────────────────────────────────────
// All endpoints require authentication; available to every authenticated role.
router.get(   "/profile",        protect, getMyProfile);
router.patch( "/profile",        protect, updateMyProfile);
router.post(  "/profile/avatar", protect, uploadAvatarMiddleware, uploadMyAvatar);
router.patch( "/password",       protect, changeMyPassword);

module.exports = router;
