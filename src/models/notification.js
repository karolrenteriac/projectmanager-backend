const mongoose = require("mongoose");
const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } = require("../constants");

const notificationSchema = new mongoose.Schema(
  {
    // Recipient — the user who receives this notification.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Actor who triggered the event (optional — system events have no sender).
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: Object.values(NOTIFICATION_PRIORITIES),
      default: NOTIFICATION_PRIORITIES.MEDIUM,
    },
    // Contextual references — drive action buttons and project-scoped isolation.
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    deliverable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskAttachment",
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Frontend route the notification deep-links to (for action buttons).
    link: {
      type: String,
      default: null,
    },
    // Free-form payload used to deduplicate (e.g. overdue per-day key) and
    // render extra context without extra population.
    metadata: {
      type: Object,
      default: {},
    },
    // ── Legacy fields — retained for backward compatibility with the chat
    //    notification path which references entities generically. ────────────
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "entityType",
    },
    entityType: {
      type: String,
      enum: ["Task", "Project", "Document", "Chat", "Message"],
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ project: 1 });
notificationSchema.index({ task: 1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
