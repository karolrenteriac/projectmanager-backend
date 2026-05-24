const mongoose = require("mongoose");

const projectMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    role: {
      type: String,
      enum: ["COORDINATOR", "PRINCIPAL", "CORESEARCHER"],
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

projectMemberSchema.index({ organization: 1 });
projectMemberSchema.index({ user: 1 });
projectMemberSchema.index({ project: 1 });
projectMemberSchema.index({ user: 1, project: 1 }, { unique: true });
projectMemberSchema.index({ role: 1 });
projectMemberSchema.index({ isDeleted: 1 });
projectMemberSchema.index({ joinedAt: -1 });

module.exports = mongoose.models.ProjectMember || mongoose.model("ProjectMember", projectMemberSchema);
