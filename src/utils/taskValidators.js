const { AppError } = require("../errors/AppError");

/**
 * Validates a checklist array before persisting.
 * @param {Array} checklist
 */
function validateChecklist(checklist) {
  if (checklist === undefined || checklist === null) return;
  if (!Array.isArray(checklist)) throw new AppError(400, "checklist must be an array");
  if (checklist.length > 50) throw new AppError(400, "Checklist cannot exceed 50 items");
  for (let i = 0; i < checklist.length; i++) {
    const title = typeof checklist[i].title === "string" ? checklist[i].title.trim() : "";
    if (!title) throw new AppError(400, `Checklist item ${i + 1} must have a non-empty title`);
  }
}

/**
 * Validates estimatedHours before persisting.
 * @param {*} hours
 */
function validateEstimatedHours(hours) {
  if (hours === undefined || hours === null) return;
  const n = Number(hours);
  if (!Number.isFinite(n) || n < 1 || n > 1000) {
    throw new AppError(400, "estimatedHours must be a number between 1 and 1000");
  }
}

// All transitions a coordinator can make
const ALLOWED_TRANSITIONS = {
  todo: ["in-progress", "blocked", "cancelled"],
  "in-progress": ["review", "blocked", "cancelled"],
  review: ["done", "in-progress", "blocked", "cancelled"],
  done: ["in-progress", "blocked", "cancelled"],
  blocked: ["in-progress", "todo", "cancelled"],
  cancelled: ["todo"],
};

// Workers (principal / co-researcher) can only start tasks.
// Submitting for review is done via the dedicated /submit endpoint.
const WORKER_ALLOWED_TRANSITIONS = {
  todo: ["in-progress"],
};

/**
 * Validates a coordinator-level status transition.
 */
function validateStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return;

  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    throw new AppError(400, `Invalid transition from "${currentStatus}" to "${nextStatus}"`);
  }
}

/**
 * Validates a worker-level status transition.
 * Workers may only move a task from todo → in-progress.
 * All other workflow advances must go through dedicated endpoints.
 */
function assertWorkerStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return;
  const allowed = WORKER_ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(nextStatus)) {
    throw new AppError(
      403,
      `Workers can only move tasks from "todo" to "in-progress". Use the "Submit for Review" action to advance further.`
    );
  }
}

/**
 * Validates if a task can be submitted for review
 */
function validateReviewSubmission(task, updateBody = {}) {
  // Auto-complete gate: if every checklist item is done, allow submission without attachment/comment
  const hasChecklist = Array.isArray(task.checklist) && task.checklist.length > 0;
  const allChecklistDone = hasChecklist && task.checklist.every(i => i.completed);
  if (allChecklistDone) return;

  const hasAttachment = task.attachments && task.attachments.length > 0;

  // Accept "submit" keyword in addition to "submission" / "completed"
  const matchesKeyword = (text) =>
    text.toLowerCase().includes("completed") ||
    text.toLowerCase().includes("submission") ||
    text.toLowerCase().includes("submit");

  const hasCompletionComment =
    (task.comments && task.comments.some(c => matchesKeyword(c.content))) ||
    (updateBody.comment && matchesKeyword(updateBody.comment));

  if (!hasAttachment && !hasCompletionComment && !updateBody.attachment) {
    throw new AppError(400, "Moving to review requires at least one attachment or a completion comment.");
  }
}

/**
 * Validates if a review rejection is valid
 */
function validateReviewRejection(reviewData) {
  if (!reviewData.approved && !reviewData.comment) {
    throw new AppError(400, "Rejection requires a review comment.");
  }
}

module.exports = {
  validateChecklist,
  validateEstimatedHours,
  validateStatusTransition,
  assertWorkerStatusTransition,
  validateReviewSubmission,
  validateReviewRejection,
};
