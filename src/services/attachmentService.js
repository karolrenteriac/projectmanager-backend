const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Task = require("../models/Task");
const TaskAttachment = require("../models/taskAttachment");
const AttachmentVersion = require("../models/attachmentVersion");
const Project = require("../models/project");
const User = require("../models/user");
const { AppError } = require("../errors/AppError");
const { emitToProjectRoom } = require("../utils/socketEmit");
const activityLogService = require("./activityLogService");
const notificationEvents = require("./notificationEvents");
const { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES } = require("../constants/activity");

const WORKER_ROLES = ["principal", "co-researcher"];

const populateOptions = [
  { path: "task", select: "title status" },
  { path: "project", select: "title" },
  { path: "uploadedBy", select: "name email" },
  { path: "versions", populate: { path: "uploadedBy reviewedBy rejectedBy approvedBy", select: "name email" } },
  { path: "latestVersion", populate: { path: "uploadedBy reviewedBy rejectedBy approvedBy", select: "name email" } },
];

// ─── Permission Helpers ─────────────────────────────────────────────────────

async function assertCanUploadDeliverable(actor, task) {
  if (!WORKER_ROLES.includes(actor.role)) {
    throw new AppError(403, "Only researchers can upload deliverables");
  }
  const isAssigned = task.assignedTo && String(task.assignedTo) === String(actor.userId);
  if (isAssigned) return;

  if (actor.role === "principal") {
    const Project = require("../models/project");
    const project = await Project.findOne({
      _id: task.project?._id || task.project,
      principalResearchers: actor.userId,
      isDeleted: false,
    });
    if (project) return;
  }

  throw new AppError(403, "You can only upload deliverables for tasks assigned to you");
}

function assertCanReviewDeliverable(actor) {
  if (actor.role !== "coordinator") {
    throw new AppError(403, "Only coordinators can review deliverables");
  }
}

// ─── uploadInitialDeliverable ──────────────────────────────────────────────

/**
 * Researcher uploads initial deliverable for a task.
 * Creates TaskAttachment with first version.
 * Moves task to REVIEW status.
 */
async function uploadInitialDeliverable(taskId, file, title, description, actor) {
  if (!file) throw new AppError(400, "No file provided");
  if (!title) throw new AppError(400, "Deliverable title is required");

  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false })
    .populate("project");
  if (!task) throw new AppError(404, "Task not found");

  // Verify task is in appropriate status for initial upload
  if (!["todo", "in-progress", "changes-requested"].includes(task.status)) {
    throw new AppError(400, `Cannot upload deliverable when task status is "${task.status}"`);
  }

  // Verify researcher is assigned
  await assertCanUploadDeliverable(actor, task);

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const fileUrl = `${baseUrl}/uploads/${file.filename}`;

  // 1. Create task attachment (without version reference initially)
  const attachment = new TaskAttachment({
    task: taskId,
    project: task.project._id || task.project,
    title: title.trim(),
    description: description ? description.trim() : "",
    currentVersionNumber: 1,
    uploadedBy: actor.userId,
    status: "saved",
  });

  // 2. Create the first version with the attachment's _id
  const version = await AttachmentVersion.create({
    attachment: attachment._id,
    versionNumber: 1,
    fileUrl,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: actor.userId,
    uploadedAt: new Date(),
    status: "saved",
  });

  // 3. Update task attachment with version reference and save
  attachment.versions = [version._id];
  attachment.latestVersion = version._id;
  await attachment.save();

  // Add attachment to task
  task.deliverables.push(attachment._id);

  // Do NOT auto-submit or auto-change task status
  const previousStatus = task.status;
  await task.save();
  await task.populate("deliverables");

  // Activity log
  activityLogService
    .logActivity(
      actor.userId,
      ACTIVITY_ACTIONS.TASK_ATTACHMENT_UPLOADED,
      ACTIVITY_ENTITIES.TASK,
      taskId,
      actor.organization,
      {
        attachmentTitle: title,
        fileName: file.originalname,
        versionNumber: 1,
        movedFromStatus: previousStatus,
      }
    )
    .catch(console.error);

  // Socket event - deliverableSaved
  emitToProjectRoom(
    task.project._id,
    "deliverableSaved",
    {
      type: "deliverableSaved",
      projectId: String(task.project._id),
      taskId: String(taskId),
      actor: { id: actor.userId, name: actor.name, role: actor.role },
      timestamp: new Date().toISOString(),
      data: {
        attachmentId: String(attachment._id),
        attachmentTitle: title,
        versionNumber: 1,
        fileName: file.originalname,
        uploadedBy: { id: String(actor.userId), name: actor.name },
      },
    }
  );

  // Also emit generic versionUploaded for compatibility
  emitToProjectRoom(
    task.project._id,
    "versionUploaded",
    {
      type: "versionUploaded",
      projectId: String(task.project._id),
      taskId: String(taskId),
      actor: { id: actor.userId, name: actor.name, role: actor.role },
      timestamp: new Date().toISOString(),
      data: {
        attachmentId: String(attachment._id),
        attachmentTitle: title,
        versionNumber: 1,
        fileName: file.originalname,
        uploadedBy: { id: String(actor.userId), name: actor.name },
      },
    }
  );

  // Notify the project coordinator of the new deliverable.
  notificationEvents.deliverableUploaded({ task, attachment, actor });

  return { attachment, taskStatus: task.status };
}

// ─── uploadNewVersion ──────────────────────────────────────────────────────

/**
 * Researcher uploads new version after changes-requested.
 * Creates new AttachmentVersion and updates attachment metadata.
 */
async function uploadNewVersion(taskId, attachmentId, file, changeReason, actor) {
  if (!file) throw new AppError(400, "No file provided");

  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false })
    .populate("project");
  if (!task) throw new AppError(404, "Task not found");

  if (!["in-progress", "changes-requested"].includes(task.status)) {
    throw new AppError(400, `Cannot upload new version when task status is "${task.status}". Only allowed during IN PROGRESS or CHANGES REQUESTED.`);
  }

  await assertCanUploadDeliverable(actor, task);

  const attachment = await TaskAttachment.findOne({
    _id: attachmentId,
    task: taskId,
    isDeleted: false,
  });
  if (!attachment) throw new AppError(404, "Deliverable not found");

  // Create new version
  const nextVersionNumber = attachment.currentVersionNumber + 1;
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const fileUrl = `${baseUrl}/uploads/${file.filename}`;

  const version = await AttachmentVersion.create({
    attachment: attachmentId,
    versionNumber: nextVersionNumber,
    fileUrl,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: actor.userId,
    uploadedAt: new Date(),
    status: "saved",
    changeReason: changeReason ? changeReason.trim() : "",
  });

  // Update attachment
  attachment.versions.push(version._id);
  attachment.currentVersionNumber = nextVersionNumber;
  attachment.latestVersion = version._id;
  attachment.status = "saved";
  await attachment.save();

  // Do NOT auto-submit or auto-change task status
  const previousStatus = task.status;
  await task.save();

  // Activity log
  activityLogService
    .logActivity(
      actor.userId,
      ACTIVITY_ACTIONS.TASK_ATTACHMENT_UPLOADED,
      ACTIVITY_ENTITIES.TASK,
      taskId,
      actor.organization,
      {
        attachmentTitle: attachment.title,
        fileName: file.originalname,
        versionNumber: nextVersionNumber,
        changeReason,
        movedFromStatus: previousStatus,
      }
    )
    .catch(console.error);

  // Socket event - correctedVersionUploaded
  emitToProjectRoom(
    task.project._id,
    "correctedVersionUploaded",
    {
      type: "correctedVersionUploaded",
      projectId: String(task.project._id),
      taskId: String(taskId),
      actor: { id: actor.userId, name: actor.name, role: actor.role },
      timestamp: new Date().toISOString(),
      data: {
        attachmentId: String(attachmentId),
        attachmentTitle: attachment.title,
        versionNumber: nextVersionNumber,
        fileName: file.originalname,
        uploadedBy: { id: String(actor.userId), name: actor.name },
        changeReason,
      },
    }
  );

  // Socket event - versionUploaded (generic for compatibility)
  emitToProjectRoom(
    task.project._id,
    "versionUploaded",
    {
      type: "versionUploaded",
      projectId: String(task.project._id),
      taskId: String(taskId),
      actor: { id: actor.userId, name: actor.name, role: actor.role },
      timestamp: new Date().toISOString(),
      data: {
        attachmentId: String(attachmentId),
        attachmentTitle: attachment.title,
        versionNumber: nextVersionNumber,
        fileName: file.originalname,
        uploadedBy: { id: String(actor.userId), name: actor.name },
        changeReason,
      },
    }
  );

  // Notify the project coordinator that a new version is available.
  notificationEvents.deliverableVersionUploaded({ task, attachment, actor });

  return { attachment, taskStatus: task.status };
}

// ─── getVersionHistory ─────────────────────────────────────────────────────

/**
 * Get complete version history for an attachment.
 * Available to task assignee and coordinators.
 */
async function getVersionHistory(taskId, attachmentId, actor) {
  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false });
  if (!task) throw new AppError(404, "Task not found");

  // Verify access
  const access = await ensureTaskAccess(task, actor);
  if (!access) throw new AppError(403, "You do not have access to this task");

  const attachment = await TaskAttachment.findOne({
    _id: attachmentId,
    task: taskId,
    isDeleted: false,
  }).populate("uploadedBy", "name email").populate({
    path: "versions",
    populate: {
      path: "uploadedBy reviewedBy rejectedBy approvedBy",
      select: "name email",
    },
  });

  if (!attachment) throw new AppError(404, "Deliverable not found");

  return {
    attachment: {
      id: String(attachment._id),
      title: attachment.title,
      description: attachment.description,
      currentVersionNumber: attachment.currentVersionNumber,
      status: attachment.status,
      createdAt: attachment.createdAt,
      uploadedBy: attachment.uploadedBy ? {
        id: String(attachment.uploadedBy._id),
        name: attachment.uploadedBy.name,
        email: attachment.uploadedBy.email,
      } : null,
    },
    versions: attachment.versions.map(formatVersionForResponse),
  };
}

// ─── reviewDeliverable ─────────────────────────────────────────────────────

/**
 * Coordinator approves or rejects a deliverable version.
 * Approved  → attachment status becomes "approved"
 * Rejected  → attachment status becomes "rejected", task moves to "changes-requested"
 */
async function reviewDeliverable(taskId, attachmentId, approved, reviewFeedback, actor) {
  assertCanReviewDeliverable(actor);

  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false })
    .populate("project");
  if (!task) throw new AppError(404, "Task not found");

  if (task.status !== "review") {
    throw new AppError(400, "Task is not in review status");
  }

  // Verify coordinator manages this project
  const access = await ensureProjectMember(task.project._id || task.project, actor.userId, actor);
  if (!access.ok) throw new AppError(access.status, access.message);

  const attachment = await TaskAttachment.findOne({
    _id: attachmentId,
    task: taskId,
    isDeleted: false,
  });
  if (!attachment) throw new AppError(404, "Deliverable not found");

  if (!approved && !reviewFeedback) {
    throw new AppError(400, "Rejection requires review feedback");
  }

  // Get latest version
  const latestVersion = await AttachmentVersion.findById(attachment.latestVersion);
  if (!latestVersion) throw new AppError(404, "Version not found");

  // Update version status and review data
  const now = new Date();
  latestVersion.status = approved ? "approved" : "rejected";
  latestVersion.reviewedBy = actor.userId;
  latestVersion.reviewDate = now;
  latestVersion.reviewFeedback = reviewFeedback || null;

  if (approved) {
    latestVersion.approvedBy = actor.userId;
    latestVersion.approvedAt = now;
  } else {
    latestVersion.rejectedBy = actor.userId;
    latestVersion.rejectionReason = reviewFeedback || null;
    latestVersion.rejectedAt = now;
  }

  await latestVersion.save();

  // Update attachment status
  attachment.status = approved ? "approved" : "rejected";
  await attachment.save();

  // Update task status
  const previousTaskStatus = task.status;
  if (approved) {
    // Mark deliverable as approved, task can proceed to done
    task.status = "done";
  } else {
    // Rejected — task moves to changes-requested
    task.status = "changes-requested";
  }
  await task.save();

  // Activity log
  const action = approved ? ACTIVITY_ACTIONS.TASK_APPROVED : ACTIVITY_ACTIONS.TASK_REJECTED;
  activityLogService
    .logActivity(
      actor.userId,
      action,
      ACTIVITY_ENTITIES.TASK,
      taskId,
      actor.organization,
      {
        attachmentTitle: attachment.title,
        versionNumber: latestVersion.versionNumber,
        approved,
        feedback: reviewFeedback,
        taskMovedFrom: previousTaskStatus,
        taskMovedTo: task.status,
      }
    )
    .catch(console.error);

  // Socket event
  const eventType = approved ? "versionApproved" : "versionRejected";
  emitToProjectRoom(
    task.project._id,
    eventType,
    {
      type: eventType,
      projectId: String(task.project._id),
      taskId: String(taskId),
      actor: { id: actor.userId, name: actor.name, role: actor.role },
      timestamp: new Date().toISOString(),
      data: {
        attachmentId: String(attachmentId),
        attachmentTitle: attachment.title,
        versionNumber: latestVersion.versionNumber,
        approved,
        feedback: reviewFeedback,
        taskStatus: task.status,
      },
    }
  );

  // Emit standard reviewApproved / reviewRejected / changesRequested events
  if (approved) {
    emitToProjectRoom(
      task.project._id,
      "reviewApproved",
      {
        type: "reviewApproved",
        projectId: String(task.project._id),
        taskId: String(taskId),
        actor: { id: actor.userId, name: actor.name, role: actor.role },
        timestamp: new Date().toISOString(),
        data: {
          attachmentId: String(attachmentId),
          attachmentTitle: attachment.title,
          versionNumber: latestVersion.versionNumber,
          approved: true,
          feedback: reviewFeedback,
          taskStatus: task.status,
        },
      }
    );
  } else {
    emitToProjectRoom(
      task.project._id,
      "reviewRejected",
      {
        type: "reviewRejected",
        projectId: String(task.project._id),
        taskId: String(taskId),
        actor: { id: actor.userId, name: actor.name, role: actor.role },
        timestamp: new Date().toISOString(),
        data: {
          attachmentId: String(attachmentId),
          attachmentTitle: attachment.title,
          versionNumber: latestVersion.versionNumber,
          approved: false,
          feedback: reviewFeedback,
          taskStatus: task.status,
        },
      }
    );
    emitToProjectRoom(
      task.project._id,
      "changesRequested",
      {
        type: "changesRequested",
        projectId: String(task.project._id),
        taskId: String(taskId),
        actor: { id: actor.userId, name: actor.name, role: actor.role },
        timestamp: new Date().toISOString(),
        data: {
          attachmentId: String(attachmentId),
          attachmentTitle: attachment.title,
          versionNumber: latestVersion.versionNumber,
          approved: false,
          feedback: reviewFeedback,
          taskStatus: task.status,
        },
      }
    );
  }

  // Notify the assignee of the deliverable review outcome.
  notificationEvents.deliverableReviewed({
    task, attachment, approved, actor, feedback: reviewFeedback,
  });

  return {
    attachment: await TaskAttachment.findById(attachmentId).populate(populateOptions),
    version: formatVersionForResponse(latestVersion),
    taskStatus: task.status,
  };
}

// ─── Helper Functions ──────────────────────────────────────────────────────

async function ensureTaskAccess(task, actor) {
  const isCoordinator = actor.role === "coordinator";
  const isAssigned = task.assignedTo && String(task.assignedTo) === String(actor.userId);
  return isCoordinator || isAssigned;
}

async function ensureProjectMember(projectId, userId, actor) {
  if (actor.role === "coordinator") {
    const project = await Project.findOne({
      _id: projectId,
      coordinator: userId,
      isDeleted: false,
    });
    if (project) return { ok: true };
  }
  return { ok: false, status: 403, message: "Access denied" };
}

function formatVersionForResponse(version) {
  return {
    id: String(version._id),
    versionNumber: version.versionNumber,
    fileUrl: version.fileUrl,
    filename: version.filename,
    originalName: version.originalName,
    mimeType: version.mimeType,
    size: version.size,
    uploadedBy: version.uploadedBy ? {
      id: String(version.uploadedBy._id),
      name: version.uploadedBy.name,
      email: version.uploadedBy.email,
    } : null,
    uploadedAt: version.uploadedAt,
    status: version.status,
    reviewedBy: version.reviewedBy ? {
      id: String(version.reviewedBy._id),
      name: version.reviewedBy.name,
      email: version.reviewedBy.email,
    } : null,
    reviewDate: version.reviewDate,
    reviewFeedback: version.reviewFeedback,
    rejectedBy: version.rejectedBy ? {
      id: String(version.rejectedBy._id),
      name: version.rejectedBy.name,
      email: version.rejectedBy.email,
    } : null,
    rejectionReason: version.rejectionReason,
    rejectedAt: version.rejectedAt,
    approvedBy: version.approvedBy ? {
      id: String(version.approvedBy._id),
      name: version.approvedBy.name,
      email: version.approvedBy.email,
    } : null,
    approvedAt: version.approvedAt,
    changeReason: version.changeReason,
  };
}

// ─── submitDeliverable ─────────────────────────────────────────────────────

/**
 * Researcher manually submits their saved deliverable for review.
 * Sets status of attachment and latest version to "submitted".
 * Moves task status to "review".
 * Emits reviewSubmitted event.
 */
async function submitDeliverable(taskId, attachmentId, actor) {
  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false })
    .populate("project");
  if (!task) throw new AppError(404, "Task not found");

  // Verify task status is suitable for submission
  if (!["todo", "in-progress", "changes-requested"].includes(task.status)) {
    throw new AppError(400, `Cannot submit review when task status is "${task.status}"`);
  }

  const attachment = await TaskAttachment.findOne({ _id: attachmentId, task: taskId, isDeleted: false });
  if (!attachment) throw new AppError(404, "Deliverable not found");

  if (attachment.status !== "saved") {
    throw new AppError(400, "Only saved deliverables can be submitted for review");
  }

  // Get latest version
  const latestVersion = await AttachmentVersion.findById(attachment.latestVersion);
  if (!latestVersion) throw new AppError(404, "Latest version not found");

  // Update status to submitted
  latestVersion.status = "submitted";
  await latestVersion.save();

  attachment.status = "submitted";
  await attachment.save();

  // Move task to review status
  const previousStatus = task.status;
  task.status = "review";
  await task.save();

  // Activity log
  activityLogService
    .logActivity(
      actor.userId,
      ACTIVITY_ACTIONS.TASK_ATTACHMENT_UPLOADED,
      ACTIVITY_ENTITIES.TASK,
      taskId,
      actor.organization,
      {
        attachmentTitle: attachment.title,
        versionNumber: latestVersion.versionNumber,
        movedFromStatus: previousStatus,
        movedToStatus: "review",
      }
    )
    .catch(console.error);

  // Socket event - reviewSubmitted
  emitToProjectRoom(
    task.project._id,
    "reviewSubmitted",
    {
      type: "reviewSubmitted",
      projectId: String(task.project._id),
      taskId: String(taskId),
      actor: { id: actor.userId, name: actor.name, role: actor.role },
      timestamp: new Date().toISOString(),
      data: {
        attachmentId: String(attachmentId),
        attachmentTitle: attachment.title,
        versionNumber: latestVersion.versionNumber,
        taskStatus: task.status,
      },
    }
  );

  // Socket event - reviewRequested (generic for compatibility)
  emitToProjectRoom(
    task.project._id,
    "reviewRequested",
    {
      type: "reviewRequested",
      projectId: String(task.project._id),
      taskId: String(taskId),
      actor: { id: actor.userId, name: actor.name, role: actor.role },
      timestamp: new Date().toISOString(),
      data: {
        attachmentId: String(attachmentId),
        attachmentTitle: attachment.title,
        versionNumber: latestVersion.versionNumber,
        taskStatus: task.status,
      },
    }
  );

  // Notify the project coordinator that a deliverable awaits review.
  notificationEvents.reviewSubmitted({ task, actor });

  return { attachment, taskStatus: task.status };
}

// ─── deleteDeliverable ─────────────────────────────────────────────────────

/**
 * Researcher deletes a non-approved deliverable draft.
 * Only allowed when task is in-progress or changes-requested.
 * Approved deliverables are immutable (audit integrity).
 */
async function deleteDeliverable(taskId, attachmentId, actor) {
  if (!WORKER_ROLES.includes(actor.role)) {
    throw new AppError(403, "Only researchers can delete deliverables");
  }

  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false })
    .populate("project");
  if (!task) throw new AppError(404, "Task not found");

  if (!["in-progress", "changes-requested"].includes(task.status)) {
    throw new AppError(
      400,
      `Cannot delete deliverable when task status is "${task.status}". Deletion is only allowed during IN PROGRESS or CHANGES REQUESTED.`
    );
  }

  await assertCanUploadDeliverable(actor, task);

  const attachment = await TaskAttachment.findOne({ _id: attachmentId, task: taskId, isDeleted: false });
  if (!attachment) throw new AppError(404, "Deliverable not found");

  if (attachment.status === "approved") {
    throw new AppError(400, "Cannot delete an approved deliverable. Approved deliverables are preserved as part of the audit record.");
  }

  if (attachment.status === "submitted") {
    throw new AppError(400, "Cannot delete a deliverable that is currently under review.");
  }

  // Soft-delete — preserves AttachmentVersion records for audit trail
  attachment.isDeleted = true;
  await attachment.save();

  // Remove reference from task deliverables array
  await Task.updateOne(
    { _id: taskId },
    { $pull: { deliverables: attachment._id } }
  );

  activityLogService
    .logActivity(
      actor.userId,
      ACTIVITY_ACTIONS.TASK_ATTACHMENT_UPLOADED,
      ACTIVITY_ENTITIES.TASK,
      taskId,
      actor.organization,
      {
        attachmentTitle: attachment.title,
        action: "deleted_draft",
        versionNumber: attachment.currentVersionNumber,
      }
    )
    .catch(console.error);

  if (task.project) {
    emitToProjectRoom(
      task.project._id || task.project,
      "deliverableDeleted",
      {
        type: "deliverableDeleted",
        projectId: String(task.project._id || task.project),
        taskId: String(taskId),
        actor: { id: actor.userId, name: actor.name, role: actor.role },
        timestamp: new Date().toISOString(),
        data: { attachmentId: String(attachmentId), attachmentTitle: attachment.title },
      }
    );
  }

  // Notify the project coordinator that a deliverable draft was removed.
  notificationEvents.deliverableDeleted({ task, attachment, actor });

  return { success: true, message: "Deliverable draft deleted successfully" };
}

module.exports = {
  uploadInitialDeliverable,
  uploadNewVersion,
  getVersionHistory,
  reviewDeliverable,
  submitDeliverable,
  deleteDeliverable,
};
