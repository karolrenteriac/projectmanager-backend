const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["PROJECT", "TASK", "TEAM"],
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

chatSchema.index({ type: 1 });
chatSchema.index({ project: 1 });
chatSchema.index({ task: 1 });
chatSchema.index({ members: 1 });
chatSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Chat", chatSchema);
