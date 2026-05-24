const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    location: {
      type: String,
      trim: true,
    },
    isAllDay: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ["MEETING", "DEADLINE", "REMINDER", "MILESTONE"],
      default: "MEETING",
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },
  },
  { timestamps: true }
);

eventSchema.index({ project: 1 });
eventSchema.index({ task: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ participants: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ endDate: 1 });
eventSchema.index({ status: 1 });

module.exports = mongoose.models.Event || mongoose.model("Event", eventSchema);
