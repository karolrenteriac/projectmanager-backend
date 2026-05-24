/**
 * Overdue task notification job.
 *
 * Periodically scans for tasks whose due date has passed and that are not yet
 * finished, then emits a single CRITICAL `TASK_OVERDUE` notification to each
 * assignee. Notifications are de-duplicated by a per-task/per-due-date key so
 * a task never produces more than one overdue alert for the same deadline.
 *
 * Implemented with setInterval to avoid adding a scheduling dependency.
 */
const Task = require("../models/Task");
const Notification = require("../models/notification");
const { NOTIFICATION_TYPES } = require("../constants");
const notificationEvents = require("../services/notificationEvents");

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly
const INITIAL_DELAY_MS = 30 * 1000; // let the server settle before the first scan

async function scanOverdueTasks() {
  try {
    const now = new Date();

    const overdueTasks = await Task.find({
      isDeleted: false,
      dueDate: { $ne: null, $lt: now },
      status: { $nin: ["done", "cancelled"] },
      assignedTo: { $ne: null },
    }).select("title dueDate status project assignedTo");

    if (!overdueTasks.length) return;

    let created = 0;
    for (const task of overdueTasks) {
      const dueKey = new Date(task.dueDate).toISOString().slice(0, 10);
      const overdueKey = `${String(task._id)}:${dueKey}`;

      // Skip if this task already produced an overdue alert for this deadline.
      const alreadyNotified = await Notification.exists({
        user: task.assignedTo,
        type: NOTIFICATION_TYPES.TASK_OVERDUE,
        "metadata.overdueKey": overdueKey,
      });
      if (alreadyNotified) continue;

      await notificationEvents.taskOverdue({ task });
      created += 1;
    }

    if (created > 0) {
      console.log(`[Overdue Job] created ${created} overdue notification(s).`);
    }
  } catch (err) {
    console.error("[Overdue Job] scan failed:", err.message);
  }
}

function startOverdueNotificationJob() {
  setTimeout(scanOverdueTasks, INITIAL_DELAY_MS);
  setInterval(scanOverdueTasks, CHECK_INTERVAL_MS);
  console.log("⏰ Overdue notification job scheduled (hourly).");
}

module.exports = { startOverdueNotificationJob, scanOverdueTasks };
