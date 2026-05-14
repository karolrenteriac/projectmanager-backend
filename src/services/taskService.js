const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Task = require("../models/Task");
const Project = require("../models/project");
const User = require("../models/user");
const { AppError } = require("../errors/AppError");
const { toTaskDTO } = require("../dtos/taskDto");
const { ensureProjectMember } = require("../utils/projectAccess");
const { updateProjectProgress } = require("../utils/projectProgress");
const { emitToProjectRoom } = require("../utils/socketEmit");
const activityLogService = require("./activityLogService");
const { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES } = require("../constants/activity");
const {
  validateChecklist,
  validateEstimatedHours,
  validateStatusTransition,
  assertWorkerStatusTransition,
  validateReviewSubmission,
  validateReviewRejection,
} = require("../utils/taskValidators");

const WORKER_ROLES = ["principal", "co-researcher"];

const populateOptions = [
  { path: "assignedTo", select: "name email role" },
  { path: "project", select: "title status" },
  { path: "createdBy", select: "name email role" },
  { path: "attachments.uploadedBy", select: "name email" },
  { path: "comments.author", select: "name email" },
  { path: "checklist.completedBy", select: "name email" },
  { path: "reviewedBy", select: "name email" },
  { path: "reviewHistory.reviewedBy", select: "name email" },
  { path: "reviewHistory.rejectedBy", select: "name email" },
];

// ─── Centralised Permission Helpers ───────────────────────────────────────

/**
 * Asserts the actor is a coordinator.
 * Coordinators are the only role that manages tasks (create, edit, delete, review).
 */
function assertCanManageTasks(actor) {
  if (actor.role !== "coordinator") {
    throw new AppError(403, "Only coordinators can manage tasks");
  }
}

/**
 * Asserts the actor is a worker (principal / co-researcher)
 * AND is the assignee of the task.
 */
function assertCanExecuteTask(actor, task) {
  if (!WORKER_ROLES.includes(actor.role)) {
    throw new AppError(
      403,
      "Only principals and co-researchers can execute tasks (upload files, submit for review)"
    );
  }
  const isAssigned =
    task.assignedTo && String(task.assignedTo) === String(actor.userId);
  if (!isAssigned) {
    throw new AppError(403, "You can only interact with tasks assigned to you");
  }
}

/**
 * Asserts the actor is a coordinator (the only role that can review/approve/reject).
 */
function assertCanReviewTask(actor) {
  if (actor.role !== "coordinator") {
    throw new AppError(403, "Only coordinators can review, approve, or reject tasks");
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Computes checklist-based progress.
 * Returns null when there is no checklist (caller falls back to stored progress).
 */
function computeChecklistProgress(checklist) {
  if (!checklist || checklist.length === 0) return null;
  const total = checklist.length;
  const done = checklist.filter((i) => i.completed).length;
  return Math.round((done / total) * 100);
}

/**
 * Standardised Socket Payload — matches the spec format.
 */
function formatSocketPayload(type, projectId, task, actor) {
  const pId = task.project?._id || task.project || projectId;
  return {
    type,
    projectId: String(pId),
    taskId: String(task._id || task.id),
    actor: { id: actor.userId, name: actor.name, role: actor.role },
    timestamp: new Date().toISOString(),
    data: toTaskDTO(task),
  };
}

/**
 * Validates that a user can be assigned to a task in a project.
 * Assignees must be workers (principal / co-researcher) in the org and project.
 */
async function validateAssignment(userId, projectId, organization) {
  if (!userId) return;

  if (!mongoose.Types.ObjectId.isValid(String(userId))) {
    throw new AppError(400, "Invalid assigned user ID");
  }

  const [user, isMember] = await Promise.all([
    User.findOne({ _id: userId, organization, isDeleted: false }),
    Project.exists({ _id: projectId, members: userId, isDeleted: false }),
  ]);

  if (!user) throw new AppError(400, "Assigned user not found in your organization");
  if (!WORKER_ROLES.includes(user.role)) {
    throw new AppError(
      400,
      `Only principals and co-researchers can be assigned to tasks. "${user.name}" has role "${user.role}"`
    );
  }
  if (!isMember) throw new AppError(400, "Assigned user is not a member of this project");
}

// ─── createTask ────────────────────────────────────────────────────────────

async function createTask(body, actor) {
  // Only coordinators can create tasks
  assertCanManageTasks(actor);

  const { title, description, project, assignedTo, priority, dueDate, tags, checklist, estimatedHours } =
    body || {};

  if (!title || !project) throw new AppError(400, "Title and Project are required");

  validateChecklist(checklist);
  validateEstimatedHours(estimatedHours);

  // Coordinator must be assigned to this project
  const access = await ensureProjectMember(project, actor.userId, actor);
  if (!access.ok) throw new AppError(access.status, access.message);

  await validateAssignment(assignedTo, project, actor.organization);

  const normalizedChecklist = (checklist || []).map((item) => ({
    title: item.title.trim(),
    completed: false,
  }));

  const initialProgress = computeChecklistProgress(normalizedChecklist) ?? 0;

  const task = await Task.create({
    title,
    description,
    status: "todo",
    priority: priority || "medium",
    project,
    organization: actor.organization,
    createdBy: actor.userId,
    assignedTo: assignedTo || null,
    dueDate,
    tags: tags || [],
    checklist: normalizedChecklist,
    estimatedHours: estimatedHours ?? null,
    progress: initialProgress,
  });

  await task.populate(populateOptions);
  await updateProjectProgress(project);

  activityLogService
    .logActivity(
      actor.userId, ACTIVITY_ACTIONS.CREATE_TASK, ACTIVITY_ENTITIES.TASK,
      task._id, actor.organization,
      { taskTitle: task.title, projectId: project },
      null, null, null, task.toObject()
    )
    .catch(console.error);

  emitToProjectRoom(project, "taskCreated", formatSocketPayload("taskCreated", project, task, actor));

  return toTaskDTO(task);
}

// ─── getTasksByProject ─────────────────────────────────────────────────────

async function getTasksByProject(projectId, actor, filters = {}) {
  // Any role can view tasks if they have access to the project
  const access = await ensureProjectMember(projectId, actor.userId, actor);
  if (!access.ok) throw new AppError(access.status, access.message);

  const query = {
    project: projectId,
    organization: actor.organization,
    isDeleted: false,
  };
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  if (filters.search) query.$text = { $search: filters.search };

  const tasks = await Task.find(query).populate(populateOptions).sort({ createdAt: -1 });
  return tasks.map((t) => toTaskDTO(t));
}

// ─── updateTask ────────────────────────────────────────────────────────────

async function updateTask(taskId, body, actor) {
  const {
    title, description, priority, dueDate, tags, assignedTo,
    status, checklist, estimatedHours, comment,
  } = body || {};

  validateChecklist(checklist);
  validateEstimatedHours(estimatedHours);

  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false });
  if (!task) throw new AppError(404, "Task not found");

  const isCoordinator = actor.role === "coordinator";
  const isWorker = WORKER_ROLES.includes(actor.role);
  const isAdmin = actor.role === "admin";

  if (isAdmin) {
    throw new AppError(403, "Admins have read-only access to tasks");
  }

  if (isWorker) {
    // Workers may only update their own tasks
    const isAssigned = task.assignedTo && String(task.assignedTo) === String(actor.userId);
    if (!isAssigned) {
      throw new AppError(403, "You can only update tasks assigned to you");
    }
    // Workers cannot modify task metadata — only checklist completion
    const forbiddenFields = [title, description, priority, assignedTo, estimatedHours].filter(
      (v) => v !== undefined
    );
    // dueDate and tags are also coordinator-only
    if (forbiddenFields.length > 0 || dueDate !== undefined || tags !== undefined) {
      throw new AppError(
        403,
        "Workers can only toggle checklist items or add comments — task metadata requires coordinator"
      );
    }
    // Workers cannot change status via updateTask; they must use /submit
    if (status !== undefined) {
      assertWorkerStatusTransition(task.status, status);
    }
    // For workers, only process checklist and comment below
  }

  const before = task.toObject();

  // ── Status ────────────────────────────────────────────────────────────────
  if (status !== undefined && status !== task.status) {
    if (isWorker) {
      assertWorkerStatusTransition(task.status, status);
    } else {
      validateStatusTransition(task.status, status);
      if (status === "review") validateReviewSubmission(task, body);
    }
    const previousStatus = task.status;
    task.status = status;

    activityLogService
      .logActivity(
        actor.userId, ACTIVITY_ACTIONS.TASK_STATUS_CHANGED, ACTIVITY_ENTITIES.TASK,
        task._id, actor.organization,
        { from: previousStatus, to: status }
      )
      .catch(console.error);
  }

  // ── Coordinator-only fields ───────────────────────────────────────────────
  if (isCoordinator) {
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (tags) task.tags = tags;
    if (estimatedHours !== undefined) {
      task.estimatedHours = estimatedHours ?? null;
      activityLogService
        .logActivity(
          actor.userId, ACTIVITY_ACTIONS.TASK_ESTIMATED_HOURS_UPDATED, ACTIVITY_ENTITIES.TASK,
          task._id, actor.organization,
          { before: before.estimatedHours ?? null, after: task.estimatedHours ?? null }
        )
        .catch(console.error);
    }
    if (assignedTo !== undefined && String(assignedTo) !== String(task.assignedTo)) {
      await validateAssignment(assignedTo, task.project, actor.organization);
      task.assignedTo = assignedTo || null;
      activityLogService
        .logActivity(
          actor.userId, ACTIVITY_ACTIONS.ASSIGN_TASK, ACTIVITY_ENTITIES.TASK,
          task._id, actor.organization,
          { assignedTo }
        )
        .catch(console.error);
    }
  }

  // ── Coordinator adds coordinator comment / feedback ───────────────────────
  if (comment && isCoordinator) {
    task.comments.push({ author: actor.userId, content: comment });
  }

  // ── Checklist smart-merge (coordinator: full control; worker: toggle only) ─
  let checklistUpdated = false;
  let completionToggled = false;

  if (checklist !== undefined) {
    const existingMap = new Map(task.checklist.map((item) => [String(item._id), item]));

    if (isWorker) {
      // Workers may only toggle completion state on existing items — no adds/removes
      for (const incoming of checklist) {
        const incomingId = incoming.id || incoming._id;
        if (!incomingId) continue; // Skip — workers cannot add new items
        const existing = existingMap.get(String(incomingId));
        if (!existing) continue; // Skip unknown IDs

        const nowCompleted = Boolean(incoming.completed);
        if (!existing.completed && nowCompleted) {
          existing.completed = true;
          existing.completedAt = new Date();
          existing.completedBy = actor.userId;
          completionToggled = true;
        } else if (existing.completed && !nowCompleted) {
          existing.completed = false;
          existing.completedAt = undefined;
          existing.completedBy = undefined;
          completionToggled = true;
        }
      }
      // Rebuild checklist preserving order — worker cannot reorder
      task.checklist = Array.from(existingMap.values());
    } else {
      // Coordinator: full create/update/reorder/delete
      const merged = [];
      for (const incoming of checklist) {
        const incomingId = incoming.id || incoming._id;
        const existing = incomingId ? existingMap.get(String(incomingId)) : null;

        if (existing) {
          if (incoming.title !== undefined) existing.title = incoming.title.trim();
          const nowCompleted = Boolean(incoming.completed);
          if (!existing.completed && nowCompleted) {
            existing.completed = true;
            existing.completedAt = new Date();
            existing.completedBy = actor.userId;
            completionToggled = true;
          } else if (existing.completed && !nowCompleted) {
            existing.completed = false;
            existing.completedAt = undefined;
            existing.completedBy = undefined;
            completionToggled = true;
          }
          merged.push(existing);
        } else {
          merged.push({ title: (incoming.title || "").trim(), completed: false });
        }
      }
      task.checklist = merged;
    }

    checklistUpdated = true;
    const derived = computeChecklistProgress(task.checklist);
    if (derived !== null) task.progress = derived;
  }

  await task.save();
  await task.populate(populateOptions);

  if (status && status !== before.status) {
    await updateProjectProgress(task.project?._id || task.project);
  }

  // Activity logs
  activityLogService
    .logActivity(
      actor.userId, ACTIVITY_ACTIONS.UPDATE_TASK, ACTIVITY_ENTITIES.TASK,
      task._id, actor.organization,
      { taskTitle: task.title },
      null, null, before, task.toObject()
    )
    .catch(console.error);

  if (checklistUpdated) {
    activityLogService
      .logActivity(
        actor.userId, ACTIVITY_ACTIONS.TASK_CHECKLIST_UPDATED, ACTIVITY_ENTITIES.TASK,
        task._id, actor.organization,
        {
          completionToggled,
          completedItems: task.checklist.filter((i) => i.completed).length,
          totalItems: task.checklist.length,
        }
      )
      .catch(console.error);
  }

  emitToProjectRoom(
    task.project?._id || task.project,
    "taskUpdated",
    formatSocketPayload("taskUpdated", task.project, task, actor)
  );

  return toTaskDTO(task);
}

// ─── submitForReview ───────────────────────────────────────────────────────

/**
 * Principal / co-researcher submits their work for coordinator review.
 * Moves task from in-progress → review.
 */
async function submitForReview(taskId, submissionData, actor) {
  // Only workers can submit for review
  const { comment, attachment } = submissionData || {};

  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false });
  if (!task) throw new AppError(404, "Task not found");

  // Enforce worker-only + assignee check
  assertCanExecuteTask(actor, task);

  validateStatusTransition(task.status, "review");
  validateReviewSubmission(task, submissionData);

  const before = task.toObject();
  if (comment) task.comments.push({ author: actor.userId, content: `SUBMISSION: ${comment}` });
  if (attachment) task.attachments.push({ ...attachment, uploadedBy: actor.userId });

  task.status = "review";
  await task.save();
  await task.populate(populateOptions);

  activityLogService
    .logActivity(
      actor.userId, ACTIVITY_ACTIONS.TASK_MOVED_TO_REVIEW, ACTIVITY_ENTITIES.TASK,
      task._id, actor.organization,
      {}, null, null, before, task.toObject()
    )
    .catch(console.error);

  emitToProjectRoom(
    task.project?._id || task.project,
    "reviewRequested",
    formatSocketPayload("reviewRequested", task.project, task, actor)
  );

  return toTaskDTO(task);
}

// ─── reviewTask ────────────────────────────────────────────────────────────

/**
 * Coordinator approves or rejects a task in review.
 * Approved  → status becomes "done"
 * Rejected  → status reverts to "in-progress"; rejection stored in reviewHistory
 */
async function reviewTask(taskId, reviewData, actor) {
  const { approved, comment } = reviewData || {};

  // Only coordinators review
  assertCanReviewTask(actor);

  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false });
  if (!task) throw new AppError(404, "Task not found");

  if (task.status !== "review") throw new AppError(400, "Task is not in review status");

  if (!approved) validateReviewRejection(reviewData);

  // Verify this coordinator manages this project
  const access = await ensureProjectMember(task.project?._id || task.project, actor.userId, actor);
  if (!access.ok) throw new AppError(access.status, access.message);

  const before = task.toObject();
  const now = new Date();

  // Update latest review fields (convenience)
  task.status = approved ? "done" : "in-progress";
  task.reviewComment = comment;
  task.reviewedBy = actor.userId;
  task.reviewedAt = now;

  // Append to immutable review history (spec requirement)
  const historyEntry = approved
    ? {
        approved: true,
        reviewedBy: actor.userId,
        reviewedAt: now,
        comment: comment || null,
      }
    : {
        approved: false,
        reviewedBy: actor.userId,
        reviewedAt: now,
        comment: comment || null,
        // Rejection-specific aliases required by spec
        rejectedBy: actor.userId,
        rejectionReason: comment || null,
        rejectedAt: now,
      };

  task.reviewHistory.push(historyEntry);

  // Add a coordinator feedback comment for visibility
  if (comment) {
    const prefix = approved ? "APPROVED" : "REJECTED";
    task.comments.push({ author: actor.userId, content: `${prefix}: ${comment}` });
  }

  await task.save();
  await task.populate(populateOptions);
  await updateProjectProgress(task.project?._id || task.project);

  const action = approved ? ACTIVITY_ACTIONS.TASK_APPROVED : ACTIVITY_ACTIONS.TASK_REJECTED;
  activityLogService
    .logActivity(
      actor.userId, action, ACTIVITY_ENTITIES.TASK,
      task._id, actor.organization,
      { approved, comment },
      null, null, before, task.toObject()
    )
    .catch(console.error);

  const event = approved ? "reviewApproved" : "reviewRejected";
  const projectId = task.project?._id || task.project;
  emitToProjectRoom(projectId, event, formatSocketPayload(event, projectId, task, actor));

  return toTaskDTO(task);
}

// ─── addComment ────────────────────────────────────────────────────────────

/**
 * Any project participant (coordinator or worker) can add comments.
 * Admin is read-only and cannot comment.
 */
async function addComment(taskId, content, actor) {
  if (!content) throw new AppError(400, "Comment content is required");

  if (actor.role === "admin") {
    throw new AppError(403, "Admins have read-only access to tasks");
  }

  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false });
  if (!task) throw new AppError(404, "Task not found");

  // Verify project access
  const access = await ensureProjectMember(task.project?._id || task.project, actor.userId, actor);
  if (!access.ok) throw new AppError(access.status, access.message);

  // Workers can only comment on their assigned tasks
  if (WORKER_ROLES.includes(actor.role)) {
    const isAssigned = task.assignedTo && String(task.assignedTo) === String(actor.userId);
    if (!isAssigned) throw new AppError(403, "Workers can only comment on tasks assigned to them");
  }

  task.comments.push({ author: actor.userId, content });
  await task.save();
  await task.populate(populateOptions);

  activityLogService
    .logActivity(
      actor.userId, ACTIVITY_ACTIONS.TASK_COMMENT_ADDED, ACTIVITY_ENTITIES.TASK,
      task._id, actor.organization
    )
    .catch(console.error);

  emitToProjectRoom(
    task.project?._id || task.project,
    "taskUpdated",
    formatSocketPayload("taskUpdated", task.project, task, actor)
  );

  return toTaskDTO(task);
}

// ─── softDeleteTask ─────────────────────────────────────────────────────────

/**
 * Only coordinators can delete tasks.
 */
async function softDeleteTask(taskId, actor) {
  assertCanManageTasks(actor);

  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false });
  if (!task) throw new AppError(404, "Task not found");

  // Verify coordinator manages this project
  const access = await ensureProjectMember(task.project?._id || task.project, actor.userId, actor);
  if (!access.ok) throw new AppError(access.status, access.message);

  task.isDeleted = true;
  await task.save();
  await updateProjectProgress(task.project);

  activityLogService
    .logActivity(
      actor.userId, ACTIVITY_ACTIONS.DELETE_TASK, ACTIVITY_ENTITIES.TASK,
      task._id, actor.organization
    )
    .catch(console.error);

  emitToProjectRoom(
    task.project?._id || task.project,
    "taskDeleted",
    formatSocketPayload("taskDeleted", task.project, task, actor)
  );

  return { success: true, message: "Task deleted successfully" };
}

// ─── uploadEvidence ─────────────────────────────────────────────────────────

/**
 * Only workers (principal / co-researcher) assigned to the task can upload evidence.
 */
async function uploadEvidence(taskId, files, actor) {
  if (!files || files.length === 0) throw new AppError(400, "No files were provided");

  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false });
  if (!task) throw new AppError(404, "Task not found");

  // Enforce worker-only + assignee check
  try {
    assertCanExecuteTask(actor, task);
  } catch (err) {
    // Clean uploaded files from disk before propagating the error
    files.forEach((f) => {
      try { fs.unlinkSync(f.path); } catch (_) {}
    });
    throw err;
  }

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";

  for (const file of files) {
    task.attachments.push({
      filename:     file.filename,
      originalName: file.originalname,
      mimeType:     file.mimetype,
      size:         file.size,
      uploadedBy:   actor.userId,
      fileUrl:      `${baseUrl}/uploads/${file.filename}`,
    });
  }

  await task.save();
  await task.populate(populateOptions);

  activityLogService
    .logActivity(
      actor.userId, ACTIVITY_ACTIONS.TASK_ATTACHMENT_UPLOADED, ACTIVITY_ENTITIES.TASK,
      task._id, actor.organization,
      { taskTitle: task.title, filesUploaded: files.length }
    )
    .catch(console.error);

  emitToProjectRoom(
    task.project?._id || task.project,
    "taskUpdated",
    formatSocketPayload("taskUpdated", task.project, task, actor)
  );

  return toTaskDTO(task);
}

// ─── deleteEvidence ─────────────────────────────────────────────────────────

/**
 * Workers can delete evidence they uploaded.
 * Coordinators can delete any evidence in their assigned projects.
 */
async function deleteEvidence(taskId, evidenceId, actor) {
  const task = await Task.findOne({ _id: taskId, organization: actor.organization, isDeleted: false });
  if (!task) throw new AppError(404, "Task not found");

  const attachment = task.attachments.id(evidenceId);
  if (!attachment) throw new AppError(404, "Evidence file not found");

  const isCoordinator = actor.role === "coordinator";
  const isUploader = String(attachment.uploadedBy) === String(actor.userId);

  if (isCoordinator) {
    // Verify coordinator is assigned to this project
    const access = await ensureProjectMember(task.project?._id || task.project, actor.userId, actor);
    if (!access.ok) throw new AppError(access.status, access.message);
  } else if (WORKER_ROLES.includes(actor.role)) {
    if (!isUploader) {
      throw new AppError(403, "You can only delete evidence files that you uploaded");
    }
    // Also verify still assigned to the task
    const isAssigned = task.assignedTo && String(task.assignedTo) === String(actor.userId);
    if (!isAssigned) throw new AppError(403, "You can only delete evidence on tasks assigned to you");
  } else {
    throw new AppError(403, "Admins cannot delete task evidence");
  }

  // Remove from disk
  const filePath = path.join(__dirname, "../../uploads", attachment.filename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) { console.warn("Could not delete file:", e.message); }
  }

  task.attachments.pull(evidenceId);
  await task.save();
  await task.populate(populateOptions);

  activityLogService
    .logActivity(
      actor.userId, ACTIVITY_ACTIONS.TASK_ATTACHMENT_DELETED, ACTIVITY_ENTITIES.TASK,
      task._id, actor.organization,
      { filename: attachment.originalName }
    )
    .catch(console.error);

  emitToProjectRoom(
    task.project?._id || task.project,
    "taskUpdated",
    formatSocketPayload("taskUpdated", task.project, task, actor)
  );

  return toTaskDTO(task);
}

// ─── getTaskById ────────────────────────────────────────────────────────────

async function getTaskById(id, actor) {
  const task = await Task.findOne({
    _id: id,
    organization: actor.organization,
    isDeleted: false,
  }).populate(populateOptions);

  if (!task) throw new AppError(404, "Task not found");

  const access = await ensureProjectMember(task.project?._id || task.project, actor.userId, actor);
  if (!access.ok) throw new AppError(access.status, access.message);

  return toTaskDTO(task);
}

module.exports = {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  reviewTask,
  addComment,
  softDeleteTask,
  submitForReview,
  uploadEvidence,
  deleteEvidence,
};
