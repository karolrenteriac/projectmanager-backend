const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["PROJECT", "TASK", "TEAM", "DIRECT"],
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
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

chatSchema.index({ organization: 1 });
chatSchema.index({ type: 1 });
chatSchema.index({ project: 1 });
chatSchema.index({ task: 1 });
chatSchema.index({ members: 1 });
chatSchema.index({ createdBy: 1 });
chatSchema.index({ isDeleted: 1 });
chatSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Chat", chatSchema);
