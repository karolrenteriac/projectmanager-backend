const mongoose = require("mongoose");

/**
 * TaskAttachment Schema
 * 
 * Represents a deliverable attachment on a task.
 * Contains references to all versions of this attachment.
 * Tracks metadata and current version state.
 */
const taskAttachmentSchema = new mongoose.Schema(
  {
    // ─── Task reference ───────────────────────────────────────────────────
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // ─── Attachment metadata ──────────────────────────────────────────────
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // ─── Version tracking ─────────────────────────────────────────────────
    versions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AttachmentVersion",
      },
    ],
    currentVersionNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    latestVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttachmentVersion",
    },

    // ─── Uploader (original uploader) ──────────────────────────────────────
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ─── Status for quick lookup ──────────────────────────────────────────
    status: {
      type: String,
      enum: ["saved", "submitted", "rejected", "approved"],
      default: "saved",
      index: true,
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

// Efficient queries for task attachments
taskAttachmentSchema.index({ task: 1, isDeleted: 1 });
taskAttachmentSchema.index({ task: 1, status: 1 });

// For attachment history queries
taskAttachmentSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.models.TaskAttachment || 
  mongoose.model("TaskAttachment", taskAttachmentSchema);
