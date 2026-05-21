const mongoose = require("mongoose");

// Executive report categories supported by the Admin Reports module.
const REPORT_TYPES = [
  "executive",
  "project-progress",
  "deliverable-summary",
  "researcher-performance",
  "activity-audit",
  "overdue-analysis",
];

// Snapshot of the metrics at the moment the report was generated.
const metricsSchema = new mongoose.Schema(
  {
    totalProjects: { type: Number, default: 0 },
    activeProjects: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    overdueProjects: { type: Number, default: 0 },

    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    inProgressTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 },

    totalDeliverables: { type: Number, default: 0 },
    pendingReviews: { type: Number, default: 0 },
    approvedDeliverables: { type: Number, default: 0 },
    rejectedDeliverables: { type: Number, default: 0 },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: REPORT_TYPES,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Org scope — every report belongs to a single organization (admin account).
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Optional single-project focus; null for org-wide reports.
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dateRange: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },

    metrics: {
      type: metricsSchema,
      default: () => ({}),
    },

    filters: {
      researchers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      statuses: [{ type: String }],
      projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    },

    // Relative paths under /uploads served statically by the API.
    generatedFile: {
      pdfUrl: { type: String, default: null },
      excelUrl: { type: String, default: null },
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

reportSchema.index({ organization: 1, isDeleted: 1 });
reportSchema.index({ organization: 1, type: 1 });
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ createdAt: -1 });

const Report =
  mongoose.models.Report || mongoose.model("Report", reportSchema);

module.exports = Report;
module.exports.REPORT_TYPES = REPORT_TYPES;
