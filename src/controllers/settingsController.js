const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const { AppError } = require("../errors/AppError");
const notificationEvents = require("../services/notificationEvents");

const SALT_ROUNDS = 10;

/**
 * Map system role to display title shown on the profile page.
 */
const ROLE_TITLES = {
  admin: "Administrator",
  coordinator: "Coordinator",
  principal: "Principal Researcher",
  "co-researcher": "Co-Researcher",
};

/**
 * Resolve the institution name for any user.
 * The admin user owns `companyName`; non-admins inherit it from their org's admin.
 */
async function resolveInstitutionName(user) {
  if (user.role === "admin") return user.companyName || "";
  const admin = await User.findById(user.organization).select("companyName name");
  if (!admin) return "";
  return admin.companyName || admin.name || "";
}

function avatarUrl(avatarPath) {
  if (!avatarPath) return "";
  if (/^https?:\/\//i.test(avatarPath)) return avatarPath;
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  return `${baseUrl}${avatarPath}`;
}

async function buildProfileDTO(user) {
  const institutionName = await resolveInstitutionName(user);
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleTitle: ROLE_TITLES[user.role] || user.role,
    institution: institutionName,
    biography: user.biography || "",
    avatar: avatarUrl(user.avatar),
  };
}

// GET /api/settings/profile
exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) throw new AppError(404, "User not found");
    const dto = await buildProfileDTO(user);
    res.json({ success: true, profile: dto });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/settings/profile
 *
 * SECURITY RULE — strict whitelist:
 *   The ONLY field a user may modify through this endpoint is `biography`.
 *   Any attempt to send name / email / role / institution / companyName /
 *   organization / isActive / isDeleted is silently dropped.
 */
exports.updateMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) throw new AppError(404, "User not found");

    if (typeof req.body.biography === "string") {
      const bio = req.body.biography.trim();
      if (bio.length > 2000) {
        throw new AppError(400, "Biography must be 2000 characters or less");
      }
      user.biography = bio;
    }

    await user.save();
    notificationEvents.profileUpdated({ userId: req.user.userId });
    const dto = await buildProfileDTO(user);
    res.json({ success: true, profile: dto });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/settings/profile/avatar
 *
 * Multer attaches the uploaded file to req.file (single 'avatar' field).
 * The previous avatar file (if any) is removed from disk to avoid orphans.
 */
exports.uploadMyAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "No avatar file uploaded");

    const user = await User.findById(req.user.userId);
    if (!user) throw new AppError(404, "User not found");

    // Delete previous avatar from disk if it lived in /uploads/avatars/
    if (user.avatar && user.avatar.startsWith("/uploads/avatars/")) {
      const prevPath = path.join(__dirname, "../..", user.avatar);
      if (fs.existsSync(prevPath)) {
        try { fs.unlinkSync(prevPath); } catch (_) { /* best-effort */ }
      }
    }

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    const dto = await buildProfileDTO(user);
    res.json({ success: true, profile: dto });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/settings/password
 * Body: { currentPassword, newPassword }
 */
exports.changeMyPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      throw new AppError(400, "Current and new passwords are required");
    }
    if (newPassword.length < 8) {
      throw new AppError(400, "New password must be at least 8 characters");
    }
    if (currentPassword === newPassword) {
      throw new AppError(400, "New password must be different from current password");
    }

    const user = await User.findById(req.user.userId);
    if (!user) throw new AppError(404, "User not found");

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) throw new AppError(401, "Current password is incorrect");

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    notificationEvents.passwordChanged({ userId: req.user.userId });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};
