const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    objectives: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["planning", "in-progress", "completed"],
      default: "planning",
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
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
    projectCoordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    principalResearchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    coResearchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

projectSchema.index({ organization: 1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ projectCoordinator: 1 });
projectSchema.index({ principalResearchers: 1 });
projectSchema.index({ coResearchers: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ isDeleted: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ title: "text", description: "text" });

module.exports = mongoose.models.Project || mongoose.model("Project", projectSchema);
