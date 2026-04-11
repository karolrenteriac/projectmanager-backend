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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

documentSchema.index({ project: 1 });
documentSchema.index({ createdBy: 1 });
documentSchema.index({ currentVersion: 1 });

module.exports = mongoose.model("Document", documentSchema);
