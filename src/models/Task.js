const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Stores every approve/reject decision for full audit trail
const reviewHistorySchema = new mongoose.Schema({
  approved: { type: Boolean, required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reviewedAt: { type: Date, default: Date.now },
  comment: { type: String },
  // Rejection-specific fields (spec requirement)
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rejectionReason: { type: String },
  rejectedAt: { type: Date },
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uploadedAt: { type: Date, default: Date.now },
  description: { type: String },
  fileUrl: { type: String, required: true },
});

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
});

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "done", "blocked", "cancelled"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
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
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    dueDate: {
      type: Date,
    },
    tags: [String],
    checklist: [checklistItemSchema],
    estimatedHours: { type: Number, min: 1, max: 1000, default: null },
    attachments: [attachmentSchema],
    comments: [commentSchema],
    
    // Review System — latest decision (convenience fields)
    reviewComment: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },

    // Full audit trail of all review decisions
    reviewHistory: [reviewHistorySchema],

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// 🚀 OPTIMIZED INDEXES
// Strictly filtered by organization and project first
taskSchema.index({ organization: 1, isDeleted: 1 });
taskSchema.index({ organization: 1, project: 1, isDeleted: 1 });
taskSchema.index({ organization: 1, assignedTo: 1, isDeleted: 1 });
taskSchema.index({ project: 1, status: 1, isDeleted: 1 }); // Kanban sorting
taskSchema.index({ project: 1, priority: 1, isDeleted: 1 });
taskSchema.index({ project: 1, dueDate: 1, isDeleted: 1 });
taskSchema.index({ title: "text", description: "text" });

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);
