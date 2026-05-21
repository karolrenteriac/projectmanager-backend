const { toUserDTO } = require("./userDto");
const { toProjectSummaryDTO } = require("./projectDto");

function _checklistStats(checklist) {
  const items = checklist || [];
  const total = items.length;
  const completed = items.filter(i => i.completed).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, progress };
}

/**
 * Format a single version for DTO
 */
function _formatVersion(version) {
  if (!version) return null;
  const v = version.toObject ? version.toObject() : version;
  return {
    id: v._id?.toString(),
    versionNumber: v.versionNumber,
    fileUrl: v.fileUrl,
    filename: v.filename,
    originalName: v.originalName,
    mimeType: v.mimeType,
    size: v.size,
    uploadedBy: toUserDTO(v.uploadedBy),
    uploadedAt: v.uploadedAt,
    status: v.status,
    reviewedBy: toUserDTO(v.reviewedBy),
    reviewDate: v.reviewDate,
    reviewFeedback: v.reviewFeedback,
    rejectedBy: toUserDTO(v.rejectedBy),
    rejectionReason: v.rejectionReason,
    rejectedAt: v.rejectedAt,
    approvedBy: toUserDTO(v.approvedBy),
    approvedAt: v.approvedAt,
    changeReason: v.changeReason,
  };
}

/**
 * Format a deliverable attachment for DTO
 */
function _formatDeliverable(deliverable) {
  if (!deliverable) return null;
  const d = deliverable.toObject ? deliverable.toObject() : deliverable;
  return {
    id: d._id?.toString(),
    title: d.title,
    description: d.description,
    currentVersionNumber: d.currentVersionNumber,
    status: d.status,
    uploadedBy: toUserDTO(d.uploadedBy),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    versions: (d.versions || []).map(_formatVersion),
    latestVersion: _formatVersion(d.latestVersion),
  };
}

/**
 * @param {import("mongoose").Document | Record<string, unknown> | null | undefined} task
 */
function toTaskDTO(task) {
  if (!task) return null;
  const t = task.toObject ? task.toObject() : task;

  const projectRef = t.project;
  const project =
    projectRef && typeof projectRef === "object" && projectRef._id
      ? toProjectSummaryDTO(projectRef)
      : projectRef;

  const { total, completed, progress: checklistProgress } = _checklistStats(t.checklist);

  return {
    id: t._id != null ? t._id.toString() : String(t.id),
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    tags: t.tags || [],
    project,
    organization: t.organization,
    createdBy: toUserDTO(t.createdBy),
    assignedTo: toUserDTO(t.assignedTo),
    estimatedHours: t.estimatedHours ?? null,
    progress: t.progress || 0,

    // Checklist
    checklist: (t.checklist || []).map(item => ({
      id: item._id?.toString(),
      title: item.title,
      completed: item.completed || false,
      completedAt: item.completedAt ?? null,
      completedBy: item.completedBy ? toUserDTO(item.completedBy) : null,
    })),
    checklistProgress,
    completedChecklistItems: completed,
    totalChecklistItems: total,

    // Attachments
    attachments: (t.attachments || []).map(att => ({
      id: att._id?.toString(),
      filename: att.filename,
      originalName: att.originalName,
      mimeType: att.mimeType,
      size: att.size,
      uploadedBy: toUserDTO(att.uploadedBy),
      uploadedAt: att.uploadedAt,
      description: att.description,
      fileUrl: att.fileUrl,
    })),

    // Versioned Deliverables (research workflow)
    deliverables: (t.deliverables || []).map(_formatDeliverable),

    // Comments
    comments: (t.comments || []).map(com => ({
      id: com._id?.toString(),
      author: toUserDTO(com.author),
      content: com.content,
      createdAt: com.createdAt,
      editedAt: com.editedAt,
    })),

    // Latest review decision (convenience)
    reviewComment: t.reviewComment,
    reviewedBy: toUserDTO(t.reviewedBy),
    reviewedAt: t.reviewedAt,

    // Full review audit trail
    reviewHistory: (t.reviewHistory || []).map(entry => ({
      approved: entry.approved,
      reviewedBy: entry.reviewedBy ? toUserDTO(entry.reviewedBy) : null,
      reviewedAt: entry.reviewedAt,
      comment: entry.comment || null,
      // Rejection-specific fields
      rejectedBy: entry.rejectedBy ? toUserDTO(entry.rejectedBy) : null,
      rejectionReason: entry.rejectionReason || null,
      rejectedAt: entry.rejectedAt || null,
    })),

    isDeleted: t.isDeleted || false,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

module.exports = { toTaskDTO };
