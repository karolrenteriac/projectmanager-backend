const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["admin", "coordinator", "principal", "co-researcher"],
      default: "co-researcher"
    },

    // 🔥 SIEMPRE OBLIGATORIO
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // usamos el admin como organización (tu diseño actual)
      required: true
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // ── Profile (Settings page) ──────────────────────────────────────────
    biography: { type: String, default: "", trim: true, maxlength: 2000 },
    avatar:    { type: String, default: "" }, // relative path: /uploads/avatars/<filename>

    // ── Institutional identity ───────────────────────────────────────────
    // Only meaningful on admin documents (admin = organization owner).
    // For non-admin users, the institution is resolved by looking up their
    // organization's admin document. Always read-only via profile API.
    companyName: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

// evitar duplicados por empresa
userSchema.index({ organization: 1, email: 1 }, { unique: true });
userSchema.index({ organization: 1, isActive: 1 });
userSchema.index({ organization: 1, role: 1 });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);