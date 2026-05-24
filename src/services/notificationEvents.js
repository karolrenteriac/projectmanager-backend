/**
 * notificationEvents
 *
 * Workflow glue between the domain services (task / attachment / project /
 * settings) and the notification service. Every function here is
 * fire-and-forget: it resolves silently on success AND on failure, so a
 * notification problem can never break the workflow that triggered it.
 *
 * Recipient scoping is the security boundary — each generator notifies only
 * the users genuinely involved in the event (assignee, project coordinator,
 * project members). There are no global or cross-project notifications.
 */
const notificationService = require("./notificationService");
const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } = require("../constants");

const T = NOTIFICATION_TYPES;
const P = NOTIFICATION_PRIORITIES;

/** Extract a string id from an id, populated doc, or null. */
function idOf(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
}

/** Run a generator without ever letting it throw into the caller. */
async function safe(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`[notificationEvents] ${label} failed:`, err.message);
  }
}

/**
 * Resolve a project's people. Accepts a project id OR a populated project.
 * @returns {Promise<{coordinator: string|null, principals: string[], coResearchers: string[], all: string[], title: string}|null>}
 */
async function getProjectParticipants(projectRef) {
  const Project = require("../models/project");
  let project = projectRef;

  const needsLoad =
    !project ||
    typeof project === "string" ||
    project.coordinator === undefined ||
    project.principalResearchers === undefined;

  if (needsLoad) {
    project = await Project.findById(idOf(projectRef)).select(
      "coordinator principalResearchers coResearchers title"
    );
  }
  if (!project) return null;

  const coordinator = project.coordinator ? idOf(project.coordinator) : null;
  const principals = (project.principalResearchers || []).map(idOf).filter(Boolean);
  const coResearchers = (project.coResearchers || []).map(idOf).filter(Boolean);
  const all = [...new Set([coordinator, ...principals, ...coResearchers].filter(Boolean))];

  return { coordinator, principals, coResearchers, all, title: project.title || "Project" };
}

// ─── Task events ─────────────────────────────────────────────────────────────

/** A researcher has been assigned to a task. */
function taskAssigned({ task, assigneeId, actor }) {
  return safe("taskAssigned", async () => {
    const recipient = idOf(assigneeId);
    if (!recipient || recipient === idOf(actor?.userId)) return;

    await notificationService.createNotification({
      recipient,
      sender: actor?.userId || null,
      type: T.TASK_ASSIGNED,
      title: "New task assigned",
      message: `${actor?.name || "A coordinator"} assigned you the task "${task.title}".`,
      priority: P.HIGH,
      project: idOf(task.project),
      task: idOf(task._id || task.id),
    });
  });
}

/** A coordinator changed a task's status — notify the assignee. */
function taskStatusChanged({ task, previousStatus, newStatus, actor }) {
  return safe("taskStatusChanged", async () => {
    const assignee = idOf(task.assignedTo);
    if (!assignee || assignee === idOf(actor?.userId)) return;

    await notificationService.createNotification({
      recipient: assignee,
      sender: actor?.userId || null,
      type: T.TASK_STATUS_CHANGED,
      title: "Task status updated",
      message: `"${task.title}" moved from ${previousStatus} to ${newStatus}.`,
      priority: P.MEDIUM,
      project: idOf(task.project),
      task: idOf(task._id || task.id),
      metadata: { previousStatus, newStatus },
    });
  });
}

/** A task reached "done" — inform the project's principal researchers. */
function taskCompleted({ task, actor }) {
  return safe("taskCompleted", async () => {
    const participants = await getProjectParticipants(task.project);
    if (!participants) return;

    await notificationService.createBulkNotifications(participants.principals, {
      sender: actor?.userId || null,
      type: T.TASK_COMPLETED,
      title: "Task completed",
      message: `The task "${task.title}" has been completed and approved.`,
      priority: P.MEDIUM,
      project: idOf(task.project),
      task: idOf(task._id || task.id),
    });
  });
}

// ─── Review events ───────────────────────────────────────────────────────────

/** A researcher submitted work for review — notify the project coordinator. */
function reviewSubmitted({ task, actor }) {
  return safe("reviewSubmitted", async () => {
    const participants = await getProjectParticipants(task.project);
    const coordinator = participants?.coordinator;
    if (!coordinator || coordinator === idOf(actor?.userId)) return;

    await notificationService.createNotification({
      recipient: coordinator,
      sender: actor?.userId || null,
      type: T.REVIEW_SUBMITTED,
      title: "Work submitted for review",
      message: `${actor?.name || "A researcher"} submitted "${task.title}" for your review.`,
      priority: P.HIGH,
      project: idOf(task.project),
      task: idOf(task._id || task.id),
    });
  });
}

/** A coordinator approved a task in review — notify the assignee. */
function reviewApproved({ task, actor, comment }) {
  return safe("reviewApproved", async () => {
    const assignee = idOf(task.assignedTo);
    if (assignee && assignee !== idOf(actor?.userId)) {
      await notificationService.createNotification({
        recipient: assignee,
        sender: actor?.userId || null,
        type: T.REVIEW_APPROVED,
        title: "Work approved",
        message: `${actor?.name || "Your coordinator"} approved "${task.title}".`,
        priority: P.MEDIUM,
        project: idOf(task.project),
        task: idOf(task._id || task.id),
        metadata: comment ? { comment } : {},
      });
    }
    // Approval moves the task to "done" — let the project leads know.
    await taskCompleted({ task, actor });
  });
}

/** A coordinator requested changes — notify the assignee (high priority). */
function changesRequested({ task, actor, comment }) {
  return safe("changesRequested", async () => {
    const assignee = idOf(task.assignedTo);
    if (!assignee || assignee === idOf(actor?.userId)) return;

    await notificationService.createNotification({
      recipient: assignee,
      sender: actor?.userId || null,
      type: T.CHANGES_REQUESTED,
      title: "Changes requested",
      message: `${actor?.name || "Your coordinator"} requested changes on "${task.title}".`,
      priority: P.HIGH,
      project: idOf(task.project),
      task: idOf(task._id || task.id),
      metadata: comment ? { comment } : {},
    });
  });
}

/** A task is past its due date — notify the assignee (critical). */
function taskOverdue({ task }) {
  return safe("taskOverdue", async () => {
    const assignee = idOf(task.assignedTo);
    if (!assignee) return;

    const dueKey = task.dueDate
      ? new Date(task.dueDate).toISOString().slice(0, 10)
      : "unknown";

    await notificationService.createNotification({
      recipient: assignee,
      type: T.TASK_OVERDUE,
      title: "Task overdue",
      message: `The task "${task.title}" is past its due date. Please take action.`,
      priority: P.CRITICAL,
      project: idOf(task.project),
      task: idOf(task._id || task.id),
      // Deduplication key consumed by the overdue job.
      metadata: { overdueKey: `${idOf(task._id || task.id)}:${dueKey}` },
    });
  });
}

// ─── Deliverable events ──────────────────────────────────────────────────────

/** A deliverable was uploaded / a new version added — notify the coordinator. */
function deliverableActivity({ task, attachment, actor, type, label }) {
  return safe(label, async () => {
    const participants = await getProjectParticipants(task.project);
    const coordinator = participants?.coordinator;
    if (!coordinator || coordinator === idOf(actor?.userId)) return;

    const messages = {
      [T.DELIVERABLE_UPLOADED]: `${actor?.name || "A researcher"} uploaded the deliverable "${attachment.title}" on "${task.title}".`,
      [T.DELIVERABLE_VERSION_UPLOADED]: `${actor?.name || "A researcher"} uploaded a new version of "${attachment.title}" on "${task.title}".`,
      [T.DELIVERABLE_DELETED]: `${actor?.name || "A researcher"} deleted the deliverable draft "${attachment.title}" on "${task.title}".`,
    };

    await notificationService.createNotification({
      recipient: coordinator,
      sender: actor?.userId || null,
      type,
      title:
        type === T.DELIVERABLE_DELETED
          ? "Deliverable deleted"
          : "Deliverable activity",
      message: messages[type] || `Deliverable activity on "${task.title}".`,
      priority: type === T.DELIVERABLE_DELETED ? P.LOW : P.MEDIUM,
      project: idOf(task.project),
      task: idOf(task._id || task.id),
      deliverable: idOf(attachment._id || attachment.id),
    });
  });
}

function deliverableUploaded({ task, attachment, actor }) {
  return deliverableActivity({
    task, attachment, actor,
    type: T.DELIVERABLE_UPLOADED, label: "deliverableUploaded",
  });
}

function deliverableVersionUploaded({ task, attachment, actor }) {
  return deliverableActivity({
    task, attachment, actor,
    type: T.DELIVERABLE_VERSION_UPLOADED, label: "deliverableVersionUploaded",
  });
}

function deliverableDeleted({ task, attachment, actor }) {
  return deliverableActivity({
    task, attachment, actor,
    type: T.DELIVERABLE_DELETED, label: "deliverableDeleted",
  });
}

/** A coordinator reviewed a deliverable — notify the assignee. */
function deliverableReviewed({ task, attachment, approved, actor, feedback }) {
  return safe("deliverableReviewed", async () => {
    const assignee = idOf(task.assignedTo);
    if (assignee && assignee !== idOf(actor?.userId)) {
      await notificationService.createNotification({
        recipient: assignee,
        sender: actor?.userId || null,
        type: approved ? T.DELIVERABLE_APPROVED : T.DELIVERABLE_REJECTED,
        title: approved ? "Deliverable approved" : "Deliverable rejected",
        message: approved
          ? `${actor?.name || "Your coordinator"} approved the deliverable "${attachment.title}".`
          : `${actor?.name || "Your coordinator"} rejected the deliverable "${attachment.title}". Review the feedback and resubmit.`,
        priority: approved ? P.MEDIUM : P.HIGH,
        project: idOf(task.project),
        task: idOf(task._id || task.id),
        deliverable: idOf(attachment._id || attachment.id),
        metadata: feedback ? { feedback } : {},
      });
    }
    if (approved) await taskCompleted({ task, actor });
  });
}

// ─── Project events ──────────────────────────────────────────────────────────

/** A project was created — notify every assigned member. */
function projectAssigned({ project, actor }) {
  return safe("projectAssigned", async () => {
    const participants = await getProjectParticipants(project);
    if (!participants) return;

    await notificationService.createBulkNotifications(participants.all, {
      sender: actor?.userId || null,
      type: T.PROJECT_ASSIGNED,
      title: "Added to a project",
      message: `You have been assigned to the project "${participants.title}".`,
      priority: P.HIGH,
      project: idOf(project._id || project.id || project),
    });
  });
}

/** A project was updated — notify every member (completion gets its own type). */
function projectUpdated({ project, previousStatus, actor }) {
  return safe("projectUpdated", async () => {
    const participants = await getProjectParticipants(project);
    if (!participants) return;

    const isCompletion =
      project.status === "completed" && previousStatus !== "completed";

    await notificationService.createBulkNotifications(participants.all, {
      sender: actor?.userId || null,
      type: isCompletion ? T.PROJECT_COMPLETED : T.PROJECT_UPDATED,
      title: isCompletion ? "Project completed" : "Project updated",
      message: isCompletion
        ? `The project "${participants.title}" has been marked as completed.`
        : `The project "${participants.title}" has been updated.`,
      priority: isCompletion
        ? NOTIFICATION_PRIORITIES.MEDIUM
        : NOTIFICATION_PRIORITIES.LOW,
      project: idOf(project._id || project.id || project),
    });
  });
}

// ─── System events ───────────────────────────────────────────────────────────

/** Self-notification — a security audit record for the account owner. */
function passwordChanged({ userId }) {
  return safe("passwordChanged", async () => {
    if (!userId) return;
    await notificationService.createNotification({
      recipient: idOf(userId),
      type: T.PASSWORD_CHANGED,
      title: "Password changed",
      message: "Your account password was changed successfully.",
      priority: P.HIGH,
    });
  });
}

/** Self-notification — confirms a profile change. */
function profileUpdated({ userId }) {
  return safe("profileUpdated", async () => {
    if (!userId) return;
    await notificationService.createNotification({
      recipient: idOf(userId),
      type: T.PROFILE_UPDATED,
      title: "Profile updated",
      message: "Your profile information was updated successfully.",
      priority: P.LOW,
    });
  });
}

module.exports = {
  taskAssigned,
  taskStatusChanged,
  taskCompleted,
  reviewSubmitted,
  reviewApproved,
  changesRequested,
  taskOverdue,
  deliverableUploaded,
  deliverableVersionUploaded,
  deliverableDeleted,
  deliverableReviewed,
  projectAssigned,
  projectUpdated,
  passwordChanged,
  profileUpdated,
};
