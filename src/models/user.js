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

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// 🔥 evitar duplicados por empresa
userSchema.index({ organization: 1, email: 1 }, { unique: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);