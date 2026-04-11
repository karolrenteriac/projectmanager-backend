const mongoose = require("mongoose");

const documentVersionSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

documentVersionSchema.index({ document: 1 });
documentVersionSchema.index({ version: 1 });
documentVersionSchema.index({ uploadedBy: 1 });
documentVersionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("DocumentVersion", documentVersionSchema);
