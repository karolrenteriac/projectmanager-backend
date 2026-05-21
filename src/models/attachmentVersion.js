const mongoose = require("mongoose");

/**
 * AttachmentVersion Schema
 * 
 * Tracks every version of a task attachment/deliverable.
 * Enables complete audit trail for research deliverable evolution.
 */
const attachmentVersionSchema = new mongoose.Schema(
  {
    // ─── Attachment reference ─────────────────────────────────────────────
    attachment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskAttachment",
      required: true,
      index: true,
    },

    // ─── File information ─────────────────────────────────────────────────
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
    },

    // ─── Upload metadata ──────────────────────────────────────────────────
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // ─── Status flow ──────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["saved", "submitted", "rejected", "approved"],
      default: "saved",
      index: true,
    },

    // ─── Coordinator review data ──────────────────────────────────────────
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    reviewDate: {
      type: Date,
    },
    reviewFeedback: {
      type: String,
      trim: true,
    },

    // ─── Rejection specific ───────────────────────────────────────────────
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    rejectedAt: {
      type: Date,
    },

    // ─── Approval specific ────────────────────────────────────────────────
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    approvedAt: {
      type: Date,
    },

    // ─── Resubmission reason ──────────────────────────────────────────────
    changeReason: {
      type: String,
      trim: true,
      description: "Researcher's explanation for resubmitting this version",
    },

    // ─── System metadata ──────────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient version lookup
attachmentVersionSchema.index({ attachment: 1, versionNumber: 1 }, { unique: true });

// Index for audit queries
attachmentVersionSchema.index({ attachment: 1, createdAt: -1 });

// Index for coordinator workflows
attachmentVersionSchema.index({ status: 1, reviewedBy: 1 });

module.exports = mongoose.models.AttachmentVersion || 
  mongoose.model("AttachmentVersion", attachmentVersionSchema);
