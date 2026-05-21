const mongoose = require("mongoose");

// Institutional research document categories.
const DOCUMENT_TYPES = [
  "paper",
  "survey",
  "dataset",
  "report",
  "annex",
  "methodology",
  "result",
  "evidence",
  "presentation",
];

// One immutable file version. New uploads append a version — files are never
// overwritten, so the full history is always downloadable.
const versionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  fileUrl: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  extension: { type: String, default: "" },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  notes: { type: String, default: "" },
});

const researchDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },

    // Optional project link — institutional documents may be project-agnostic.
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    // Org scope (admin account). Every query is filtered by this.
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tags: [{ type: String, trim: true }],

    currentVersion: {
      type: Number,
      default: 1,
    },
    versions: [versionSchema],

    metadata: {
      authors: [{ type: String, trim: true }],
      keywords: [{ type: String, trim: true }],
      publicationDate: { type: Date, default: null },
      institution: { type: String, trim: true, default: "" },
      category: { type: String, trim: true, default: "" },
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

researchDocumentSchema.index({ organization: 1, isDeleted: 1 });
researchDocumentSchema.index({ organization: 1, type: 1, isDeleted: 1 });
researchDocumentSchema.index({ project: 1, isDeleted: 1 });
researchDocumentSchema.index({ uploadedBy: 1 });
researchDocumentSchema.index({ tags: 1 });
researchDocumentSchema.index({ createdAt: -1 });
researchDocumentSchema.index({ title: "text", description: "text" });

const ResearchDocument =
  mongoose.models.ResearchDocument ||
  mongoose.model("ResearchDocument", researchDocumentSchema);

module.exports = ResearchDocument;
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
