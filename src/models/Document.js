const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

documentSchema.index({ organization: 1 });
documentSchema.index({ project: 1 });
documentSchema.index({ createdBy: 1 });
documentSchema.index({ currentVersion: 1 });
documentSchema.index({ isDeleted: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ name: "text" });

module.exports = mongoose.models.Document || mongoose.model("Document", documentSchema);
