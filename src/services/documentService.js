const path = require("path");
const mongoose = require("mongoose");

const ResearchDocument = require("../models/researchDocument");
const { DOCUMENT_TYPES } = require("../models/researchDocument");
const Project = require("../models/project");
const User = require("../models/user");
const { AppError } = require("../errors/AppError");
const { getPaginationParams } = require("../utils/pagination");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveOrg(user) {
  // Admin users use their own _id as organization (self-reference). If the
  // organization field is absent from legacy DB records, fall back to user.id
  // so admin accounts without an explicit org field still work correctly.
  const org = (user && user.organization) || (user && (user.id || user.userId));
  if (!org) {
    throw new AppError(400, "Organization context missing for this account");
  }
  return new mongoose.Types.ObjectId(org);
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Multipart form fields arrive as strings — accept JSON arrays, comma lists,
// or already-parsed arrays.
function parseList(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  const raw = String(value);
  if (raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      /* fall through to comma-split */
    }
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function normalizeMetadata(raw) {
  let m = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      m = JSON.parse(raw);
    } catch {
      m = {};
    }
  }
  m = m && typeof m === "object" ? m : {};

  const metadata = {
    authors: parseList(m.authors),
    keywords: parseList(m.keywords),
    publicationDate: null,
    institution: m.institution ? String(m.institution).trim() : "",
    category: m.category ? String(m.category).trim() : "",
  };
  if (m.publicationDate) {
    const d = new Date(m.publicationDate);
    if (!isNaN(d.getTime())) metadata.publicationDate = d;
  }
  return metadata;
}

// Build an immutable version record from an uploaded multer file.
function buildVersion(file, versionNumber, userId, notes) {
  return {
    versionNumber,
    fileUrl: `/uploads/research-documents/${file.filename}`,
    originalName: file.originalname,
    mimeType: file.mimetype,
    extension: path.extname(file.originalname).replace(/^\./, "").toLowerCase(),
    size: file.size,
    uploadedAt: new Date(),
    uploadedBy: userId,
    notes: notes ? String(notes).trim() : "",
  };
}

async function assertValidProject(projectId, orgId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new AppError(400, "Invalid project id.");
  }
  const project = await Project.findOne({
    _id: projectId,
    organization: orgId,
    isDeleted: false,
  }).select("_id");
  if (!project) {
    throw new AppError(404, "Project not found in your organization.");
  }
  return project._id;
}

// ─── DTO mappers ─────────────────────────────────────────────────────────────

function versionDTO(v) {
  let uploadedBy = null;
  if (v.uploadedBy && v.uploadedBy.name) {
    uploadedBy = {
      id: String(v.uploadedBy._id),
      name: v.uploadedBy.name,
      email: v.uploadedBy.email,
    };
  } else if (v.uploadedBy) {
    uploadedBy = { id: String(v.uploadedBy), name: null, email: null };
  }
  return {
    id: String(v._id),
    versionNumber: v.versionNumber,
    fileUrl: v.fileUrl,
    originalName: v.originalName,
    mimeType: v.mimeType,
    extension: v.extension || "",
    size: v.size,
    uploadedAt: v.uploadedAt,
    uploadedBy,
    notes: v.notes || "",
  };
}

function documentDTO(doc) {
  const versions = doc.versions || [];
  const latest =
    versions.find((v) => v.versionNumber === doc.currentVersion) ||
    versions[versions.length - 1] ||
    null;
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description || "",
    type: doc.type,
    project:
      doc.project && doc.project.title
        ? {
            id: String(doc.project._id),
            title: doc.project.title,
            status: doc.project.status,
          }
        : null,
    uploadedBy:
      doc.uploadedBy && doc.uploadedBy.name
        ? {
            id: String(doc.uploadedBy._id),
            name: doc.uploadedBy.name,
            email: doc.uploadedBy.email,
          }
        : null,
    tags: doc.tags || [],
    currentVersion: doc.currentVersion,
    totalVersions: versions.length,
    latestVersion: latest ? versionDTO(latest) : null,
    metadata: {
      authors: (doc.metadata && doc.metadata.authors) || [],
      keywords: (doc.metadata && doc.metadata.keywords) || [],
      publicationDate: (doc.metadata && doc.metadata.publicationDate) || null,
      institution: (doc.metadata && doc.metadata.institution) || "",
      category: (doc.metadata && doc.metadata.category) || "",
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function documentDetailDTO(doc) {
  return {
    ...documentDTO(doc),
    versions: (doc.versions || [])
      .slice()
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map(versionDTO),
  };
}

// ─── Filter builder (advanced search) ────────────────────────────────────────

function buildQuery(orgId, q = {}) {
  const match = { organization: orgId, isDeleted: false };

  if (q.type && DOCUMENT_TYPES.includes(q.type)) match.type = q.type;

  const projectId = q.project || q.projectId;
  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    match.project = new mongoose.Types.ObjectId(projectId);
  }

  const researcher = q.researcher || q.uploadedBy;
  if (researcher && mongoose.Types.ObjectId.isValid(researcher)) {
    match.uploadedBy = new mongoose.Types.ObjectId(researcher);
  }

  const tags = parseList(q.tags);
  if (tags.length) match.tags = { $in: tags };

  if (q.category) match["metadata.category"] = q.category;

  const dateClause = {};
  if (q.startDate) {
    const d = new Date(q.startDate);
    if (!isNaN(d.getTime())) dateClause.$gte = d;
  }
  if (q.endDate) {
    const d = new Date(q.endDate);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      dateClause.$lte = d;
    }
  }
  if (Object.keys(dateClause).length) match.createdAt = dateClause;

  const keyword = String(q.search || q.keyword || q.q || "").trim();
  const name = String(q.name || "").trim();
  if (keyword) {
    const rx = new RegExp(escapeRegex(keyword), "i");
    match.$or = [
      { title: rx },
      { description: rx },
      { tags: rx },
      { "metadata.keywords": rx },
      { "metadata.authors": rx },
      { "metadata.institution": rx },
    ];
  } else if (name) {
    match.title = new RegExp(escapeRegex(name), "i");
  }

  return match;
}

// ─── Public API ──────────────────────────────────────────────────────────────

// POST /upload — create a new repository document (becomes version 1).
async function createDocument(user, body = {}, file) {
  const orgId = resolveOrg(user);
  if (!file) throw new AppError(400, "A document file is required.");

  const title = body.title && String(body.title).trim();
  if (!title) throw new AppError(400, "Document title is required.");

  if (!DOCUMENT_TYPES.includes(body.type)) {
    throw new AppError(
      400,
      `Invalid document type. Allowed: ${DOCUMENT_TYPES.join(", ")}`
    );
  }

  let projectId = null;
  if (body.project && String(body.project).trim()) {
    projectId = await assertValidProject(body.project, orgId);
  }

  const userId = user.id || user.userId;
  const doc = await ResearchDocument.create({
    title,
    description: body.description ? String(body.description).trim() : "",
    type: body.type,
    project: projectId,
    organization: orgId,
    uploadedBy: userId,
    tags: parseList(body.tags),
    currentVersion: 1,
    versions: [buildVersion(file, 1, userId, body.notes)],
    metadata: normalizeMetadata(body.metadata),
  });

  return getDocument(user, doc._id);
}

// POST /:id/version — append a new immutable version (never overwrites).
async function addVersion(user, id, body = {}, file) {
  const orgId = resolveOrg(user);
  if (!file) throw new AppError(400, "A version file is required.");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, "Invalid document id.");
  }

  const doc = await ResearchDocument.findOne({
    _id: id,
    organization: orgId,
    isDeleted: false,
  });
  if (!doc) throw new AppError(404, "Document not found.");

  const userId = user.id || user.userId;
  const nextNumber = doc.currentVersion + 1;
  doc.versions.push(buildVersion(file, nextNumber, userId, body.notes));
  doc.currentVersion = nextNumber;
  await doc.save();

  return getDocument(user, doc._id);
}

// GET /:id — full document with version timeline.
async function getDocument(user, id) {
  const orgId = resolveOrg(user);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, "Invalid document id.");
  }
  const doc = await ResearchDocument.findOne({
    _id: id,
    organization: orgId,
    isDeleted: false,
  })
    .populate("project", "title status")
    .populate("uploadedBy", "name email")
    .populate("versions.uploadedBy", "name email")
    .lean();
  if (!doc) throw new AppError(404, "Document not found.");
  return documentDetailDTO(doc);
}

// GET /:id/versions — version history only.
async function getVersions(user, id) {
  const detail = await getDocument(user, id);
  return {
    documentId: detail.id,
    title: detail.title,
    currentVersion: detail.currentVersion,
    totalVersions: detail.totalVersions,
    versions: detail.versions,
  };
}

// GET / and GET /search — paginated list with advanced filtering.
async function queryDocuments(user, q = {}) {
  const orgId = resolveOrg(user);
  const match = buildQuery(orgId, q);
  const { page, limit, skip } = getPaginationParams(q);

  const [docs, total] = await Promise.all([
    ResearchDocument.find(match)
      .populate("project", "title status")
      .populate("uploadedBy", "name email")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ResearchDocument.countDocuments(match),
  ]);

  return {
    documents: docs.map(documentDTO),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

// GET /project/:projectId — documents linked to a project.
async function getProjectDocuments(user, projectId, q = {}) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new AppError(400, "Invalid project id.");
  }
  return queryDocuments(user, { ...q, project: projectId });
}

// PATCH /:id — update metadata/classification (never touches versions/files).
async function updateDocument(user, id, body = {}) {
  const orgId = resolveOrg(user);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, "Invalid document id.");
  }
  const doc = await ResearchDocument.findOne({
    _id: id,
    organization: orgId,
    isDeleted: false,
  });
  if (!doc) throw new AppError(404, "Document not found.");

  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (!t) throw new AppError(400, "Title cannot be empty.");
    doc.title = t;
  }
  if (body.description !== undefined) {
    doc.description = String(body.description).trim();
  }
  if (body.type !== undefined) {
    if (!DOCUMENT_TYPES.includes(body.type)) {
      throw new AppError(400, "Invalid document type.");
    }
    doc.type = body.type;
  }
  if (body.tags !== undefined) doc.tags = parseList(body.tags);
  if (body.project !== undefined) {
    doc.project =
      body.project && String(body.project).trim()
        ? await assertValidProject(body.project, orgId)
        : null;
  }
  if (body.metadata !== undefined) {
    doc.metadata = normalizeMetadata(body.metadata);
  }

  await doc.save();
  return getDocument(user, doc._id);
}

// DELETE /:id — SOFT delete only. Files and versions are preserved.
async function softDeleteDocument(user, id) {
  const orgId = resolveOrg(user);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, "Invalid document id.");
  }
  const doc = await ResearchDocument.findOneAndUpdate(
    { _id: id, organization: orgId, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );
  if (!doc) throw new AppError(404, "Document not found.");
  return {
    id: String(doc._id),
    message: "Document archived. All files and versions are preserved.",
  };
}

// GET /meta — option lists for the repository filter bar & upload form.
async function getMeta(user) {
  const orgId = resolveOrg(user);
  const [projects, researchers, tags] = await Promise.all([
    Project.find({ organization: orgId, isDeleted: false })
      .select("title status")
      .sort({ title: 1 })
      .lean(),
    User.find({ organization: orgId, isDeleted: false })
      .select("name email role")
      .sort({ name: 1 })
      .lean(),
    ResearchDocument.distinct("tags", {
      organization: orgId,
      isDeleted: false,
    }),
  ]);

  return {
    documentTypes: DOCUMENT_TYPES,
    projects: projects.map((p) => ({
      id: String(p._id),
      title: p.title,
      status: p.status,
    })),
    researchers: researchers.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
    })),
    tags: tags.filter(Boolean).sort(),
  };
}

module.exports = {
  createDocument,
  addVersion,
  getDocument,
  getVersions,
  queryDocuments,
  getProjectDocuments,
  updateDocument,
  softDeleteDocument,
  getMeta,
};
