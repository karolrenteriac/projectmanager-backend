const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Project = require("../models/project");
const Task = require("../models/Task");
const User = require("../models/user");
const TaskAttachment = require("../models/taskAttachment");
const ActivityLog = require("../models/activityLog");
const Report = require("../models/report");
const { REPORT_TYPES } = require("../models/report");

const { AppError } = require("../errors/AppError");
const { buildReportPdf, buildReportExcel } = require("../utils/reportFileBuilder");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveOrg(user) {
  const org = user && user.organization;
  if (!org) {
    throw new AppError(400, "Organization context missing for this account");
  }
  return new mongoose.Types.ObjectId(org);
}

function parseDateRange(src = {}) {
  const range = { startDate: null, endDate: null };
  if (src.startDate) {
    const d = new Date(src.startDate);
    if (!isNaN(d.getTime())) range.startDate = d;
  }
  if (src.endDate) {
    const d = new Date(src.endDate);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      range.endDate = d;
    }
  }
  return range;
}

function dateClause(range) {
  if (!range.startDate && !range.endDate) return null;
  const clause = {};
  if (range.startDate) clause.$gte = range.startDate;
  if (range.endDate) clause.$lte = range.endDate;
  return clause;
}

function toArray(v) {
  if (v === undefined || v === null || v === "") return [];
  if (Array.isArray(v)) return v.filter((x) => x !== undefined && x !== null && x !== "");
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
}

function toObjectIds(v) {
  return toArray(v)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function normalizeFilters(src = {}) {
  return {
    researchers: toObjectIds(src.researchers),
    projects: toObjectIds(src.projects),
    statuses: toArray(src.statuses),
  };
}

// Last N calendar months as ordered buckets for trend charts.
function lastMonths(n = 6) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString("en-US", { month: "short" }),
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
    });
  }
  return out;
}

// Resolve the set of live project _ids matching the org + filter scope.
async function resolveProjectIds(orgId, filters, range) {
  const match = { organization: orgId, isDeleted: false };
  if (filters.projects.length) match._id = { $in: filters.projects };
  if (filters.statuses.length) match.status = { $in: filters.statuses };
  const createdClause = dateClause(range);
  if (createdClause) match.createdAt = createdClause;
  const ids = await Project.distinct("_id", match);
  return { match, ids };
}

// ─── Live metrics aggregation ────────────────────────────────────────────────

async function computeMetrics(orgId, range, filters) {
  const now = new Date();
  const createdClause = dateClause(range);

  const projectMatch = { organization: orgId, isDeleted: false };
  if (filters.projects.length) projectMatch._id = { $in: filters.projects };
  if (filters.statuses.length) projectMatch.status = { $in: filters.statuses };
  if (createdClause) projectMatch.createdAt = createdClause;

  const projects = await Project.find(projectMatch).select("status endDate").lean();
  const projectIds = projects.map((p) => p._id);

  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => p.status === "planning" || p.status === "in-progress"
  ).length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const overdueProjects = projects.filter(
    (p) => p.endDate && new Date(p.endDate) < now && p.status !== "completed"
  ).length;

  const taskMatch = {
    organization: orgId,
    isDeleted: false,
    project: { $in: projectIds },
  };
  if (filters.researchers.length) taskMatch.assignedTo = { $in: filters.researchers };
  if (createdClause) taskMatch.createdAt = createdClause;

  const tasks = await Task.find(taskMatch).select("status dueDate").lean();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < now &&
      t.status !== "done" &&
      t.status !== "cancelled"
  ).length;

  const deliverables = await TaskAttachment.find({
    project: { $in: projectIds },
    isDeleted: false,
  })
    .select("status")
    .lean();
  const totalDeliverables = deliverables.length;
  const pendingReviews = deliverables.filter((d) => d.status === "submitted").length;
  const approvedDeliverables = deliverables.filter((d) => d.status === "approved").length;
  const rejectedDeliverables = deliverables.filter((d) => d.status === "rejected").length;

  return {
    metrics: {
      totalProjects,
      activeProjects,
      completedProjects,
      overdueProjects,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalDeliverables,
      pendingReviews,
      approvedDeliverables,
      rejectedDeliverables,
    },
    projectIds,
  };
}

// ─── Chart datasets (MongoDB aggregation pipelines) ──────────────────────────

async function computeCharts(orgId, projectIds, filters) {
  const months = lastMonths(6);
  const since = new Date(months[0].year, months[0].month - 1, 1);
  const idx = {};
  months.forEach((m, i) => (idx[m.key] = i));
  const now = new Date();

  // 1. Task completion trend — done tasks grouped by completion month.
  const doneAgg = await Task.aggregate([
    {
      $match: {
        organization: orgId,
        isDeleted: false,
        status: "done",
        project: { $in: projectIds },
        updatedAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: { y: { $year: "$updatedAt" }, m: { $month: "$updatedAt" } },
        count: { $sum: 1 },
      },
    },
  ]);
  const taskCompletion = new Array(months.length).fill(0);
  doneAgg.forEach((r) => {
    const k = `${r._id.y}-${r._id.m}`;
    if (idx[k] !== undefined) taskCompletion[idx[k]] = r.count;
  });

  // 2. Project progress trend — average progress grouped by creation month.
  const progAgg = await Project.aggregate([
    {
      $match: {
        organization: orgId,
        isDeleted: false,
        _id: { $in: projectIds },
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
        avg: { $avg: "$progress" },
      },
    },
  ]);
  const projectProgress = new Array(months.length).fill(0);
  progAgg.forEach((r) => {
    const k = `${r._id.y}-${r._id.m}`;
    if (idx[k] !== undefined) projectProgress[idx[k]] = Math.round(r.avg || 0);
  });

  // 3. Deliverable approval trend — approved/rejected grouped by review month.
  const delAgg = await TaskAttachment.aggregate([
    {
      $match: {
        project: { $in: projectIds },
        isDeleted: false,
        status: { $in: ["approved", "rejected"] },
        updatedAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          y: { $year: "$updatedAt" },
          m: { $month: "$updatedAt" },
          s: "$status",
        },
        count: { $sum: 1 },
      },
    },
  ]);
  const approved = new Array(months.length).fill(0);
  const rejected = new Array(months.length).fill(0);
  delAgg.forEach((r) => {
    const k = `${r._id.y}-${r._id.m}`;
    if (idx[k] === undefined) return;
    if (r._id.s === "approved") approved[idx[k]] = r.count;
    else rejected[idx[k]] = r.count;
  });

  // 4. Researcher productivity — completed task counts per assignee.
  const researcherMatch = {
    organization: orgId,
    isDeleted: false,
    status: "done",
    project: { $in: projectIds },
  };
  researcherMatch.assignedTo = filters.researchers.length
    ? { $in: filters.researchers }
    : { $ne: null };
  const researcherAgg = await Task.aggregate([
    { $match: researcherMatch },
    { $group: { _id: "$assignedTo", completed: { $sum: 1 } } },
    { $sort: { completed: -1 } },
    { $limit: 8 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    { $project: { name: "$user.name", completed: 1 } },
  ]);

  // 5. Overdue statistics — overdue tasks grouped by priority.
  const overdueAgg = await Task.aggregate([
    {
      $match: {
        organization: orgId,
        isDeleted: false,
        project: { $in: projectIds },
        dueDate: { $lt: now },
        status: { $nin: ["done", "cancelled"] },
      },
    },
    { $group: { _id: "$priority", count: { $sum: 1 } } },
  ]);
  const priorityOrder = ["low", "medium", "high", "urgent"];
  const overdueByPriority = priorityOrder.map((p) => {
    const found = overdueAgg.find((r) => r._id === p);
    return found ? found.count : 0;
  });

  const labels = months.map((m) => m.label);
  return {
    taskCompletionTrend: { labels, data: taskCompletion },
    projectProgressTrend: { labels, data: projectProgress },
    deliverableApprovalTrend: { labels, approved, rejected },
    researcherProductivity: {
      labels: researcherAgg.map((r) => r.name),
      data: researcherAgg.map((r) => r.completed),
    },
    overdueStatistics: {
      labels: ["Low", "Medium", "High", "Urgent"],
      data: overdueByPriority,
    },
  };
}

// ─── Public: overview ────────────────────────────────────────────────────────

async function getOverview(user, raw = {}) {
  const orgId = resolveOrg(user);
  const range = parseDateRange(raw);
  const filters = normalizeFilters(raw);

  const { metrics, projectIds } = await computeMetrics(orgId, range, filters);
  const charts = await computeCharts(orgId, projectIds, filters);

  const researchProductivity =
    metrics.totalTasks > 0
      ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
      : 0;

  return {
    kpis: {
      activeProjects: metrics.activeProjects,
      completedProjects: metrics.completedProjects,
      overdueTasks: metrics.overdueTasks,
      pendingReviews: metrics.pendingReviews,
      totalDeliverables: metrics.totalDeliverables,
      researchProductivity,
    },
    metrics,
    charts,
    dateRange: range,
    generatedAt: new Date(),
  };
}

// ─── Public: project report ──────────────────────────────────────────────────

async function getProjectsReport(user, raw = {}) {
  const orgId = resolveOrg(user);
  const range = parseDateRange(raw);
  const filters = normalizeFilters(raw);
  const now = new Date();
  const createdClause = dateClause(range);

  const projectMatch = { organization: orgId, isDeleted: false };
  if (filters.projects.length) projectMatch._id = { $in: filters.projects };
  if (filters.statuses.length) projectMatch.status = { $in: filters.statuses };
  if (createdClause) projectMatch.createdAt = createdClause;

  const projects = await Project.find(projectMatch)
    .populate("coordinator", "name email")
    .sort({ createdAt: -1 })
    .lean();
  const projectIds = projects.map((p) => p._id);

  const taskAgg = await Task.aggregate([
    {
      $match: {
        organization: orgId,
        isDeleted: false,
        project: { $in: projectIds },
      },
    },
    {
      $group: {
        _id: "$project",
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", now] },
                  { $not: [{ $in: ["$status", ["done", "cancelled"]] }] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  const statMap = {};
  taskAgg.forEach((r) => {
    statMap[String(r._id)] = r;
  });

  const rows = projects.map((p) => {
    const s = statMap[String(p._id)] || { total: 0, done: 0, overdue: 0 };
    return {
      id: String(p._id),
      title: p.title,
      status: p.status,
      progress: p.progress || 0,
      coordinator: p.coordinator
        ? { name: p.coordinator.name, email: p.coordinator.email }
        : null,
      startDate: p.startDate || null,
      endDate: p.endDate || null,
      createdAt: p.createdAt,
      totalTasks: s.total,
      completedTasks: s.done,
      overdueTasks: s.overdue,
      completionRate: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
    };
  });

  return {
    projects: rows,
    summary: {
      total: rows.length,
      planning: rows.filter((r) => r.status === "planning").length,
      inProgress: rows.filter((r) => r.status === "in-progress").length,
      completed: rows.filter((r) => r.status === "completed").length,
    },
  };
}

// ─── Public: task report ─────────────────────────────────────────────────────

async function getTasksReport(user, raw = {}) {
  const orgId = resolveOrg(user);
  const range = parseDateRange(raw);
  const filters = normalizeFilters(raw);
  const now = new Date();
  const createdClause = dateClause(range);

  const { ids: projectIds } = await resolveProjectIds(orgId, filters, range);

  const taskMatch = {
    organization: orgId,
    isDeleted: false,
    project: { $in: projectIds },
  };
  if (filters.researchers.length) taskMatch.assignedTo = { $in: filters.researchers };
  if (createdClause) taskMatch.createdAt = createdClause;

  const tasks = await Task.find(taskMatch)
    .populate("assignedTo", "name email")
    .populate("project", "title")
    .sort({ createdAt: -1 })
    .lean();

  const statusKeys = [
    "todo",
    "in-progress",
    "review",
    "done",
    "blocked",
    "cancelled",
    "changes-requested",
  ];
  const statusDistribution = {
    labels: [
      "To Do",
      "In Progress",
      "In Review",
      "Done",
      "Blocked",
      "Cancelled",
      "Changes Req.",
    ],
    data: statusKeys.map((s) => tasks.filter((t) => t.status === s).length),
  };

  const priorityKeys = ["low", "medium", "high", "urgent"];
  const priorityDistribution = {
    labels: ["Low", "Medium", "High", "Urgent"],
    data: priorityKeys.map(
      (p) => tasks.filter((t) => (t.priority || "medium") === p).length
    ),
  };

  const months = lastMonths(6);
  const idx = {};
  months.forEach((m, i) => (idx[m.key] = i));
  const completionTrend = {
    labels: months.map((m) => m.label),
    data: new Array(months.length).fill(0),
  };
  tasks.forEach((t) => {
    if (t.status === "done" && t.updatedAt) {
      const d = new Date(t.updatedAt);
      const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (idx[k] !== undefined) completionTrend.data[idx[k]]++;
    }
  });

  const overdue = tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < now &&
      t.status !== "done" &&
      t.status !== "cancelled"
  );

  return {
    totals: {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "done").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      overdue: overdue.length,
    },
    statusDistribution,
    priorityDistribution,
    completionTrend,
    tasks: tasks.slice(0, 100).map((t) => ({
      id: String(t._id),
      title: t.title,
      status: t.status,
      priority: t.priority || "medium",
      project: t.project ? t.project.title : null,
      assignedTo: t.assignedTo ? t.assignedTo.name : null,
      dueDate: t.dueDate || null,
      progress: t.progress || 0,
      createdAt: t.createdAt,
    })),
  };
}

// ─── Public: deliverable report ──────────────────────────────────────────────

async function getDeliverablesReport(user, raw = {}) {
  const orgId = resolveOrg(user);
  const range = parseDateRange(raw);
  const filters = normalizeFilters(raw);
  const createdClause = dateClause(range);

  const { ids: projectIds } = await resolveProjectIds(orgId, filters, range);

  const delMatch = { project: { $in: projectIds }, isDeleted: false };
  if (createdClause) delMatch.createdAt = createdClause;

  const deliverables = await TaskAttachment.find(delMatch)
    .populate("project", "title")
    .populate("task", "title")
    .populate("uploadedBy", "name email")
    .sort({ updatedAt: -1 })
    .lean();

  const statusKeys = ["saved", "submitted", "approved", "rejected"];
  const statusDistribution = {
    labels: ["Draft", "Pending Review", "Approved", "Rejected"],
    data: statusKeys.map(
      (s) => deliverables.filter((d) => d.status === s).length
    ),
  };

  const months = lastMonths(6);
  const idx = {};
  months.forEach((m, i) => (idx[m.key] = i));
  const approvalTrend = {
    labels: months.map((m) => m.label),
    approved: new Array(months.length).fill(0),
    rejected: new Array(months.length).fill(0),
  };
  deliverables.forEach((d) => {
    if ((d.status === "approved" || d.status === "rejected") && d.updatedAt) {
      const dt = new Date(d.updatedAt);
      const k = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
      if (idx[k] !== undefined) {
        if (d.status === "approved") approvalTrend.approved[idx[k]]++;
        else approvalTrend.rejected[idx[k]]++;
      }
    }
  });

  return {
    kpis: {
      total: deliverables.length,
      pending: deliverables.filter((d) => d.status === "submitted").length,
      approved: deliverables.filter((d) => d.status === "approved").length,
      rejected: deliverables.filter((d) => d.status === "rejected").length,
      draft: deliverables.filter((d) => d.status === "saved").length,
    },
    statusDistribution,
    approvalTrend,
    deliverables: deliverables.slice(0, 100).map((d) => ({
      id: String(d._id),
      title: d.title,
      project: d.project ? d.project.title : null,
      task: d.task ? d.task.title : null,
      status: d.status,
      version: d.currentVersionNumber || 1,
      uploadedBy: d.uploadedBy ? d.uploadedBy.name : null,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  };
}

// ─── Public: activity audit ──────────────────────────────────────────────────

async function getActivityReport(user, raw = {}) {
  const orgId = resolveOrg(user);
  const range = parseDateRange(raw);
  const createdClause = dateClause(range);

  const page = Math.max(parseInt(raw.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(raw.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const query = { organization: orgId };
  if (raw.userId && mongoose.Types.ObjectId.isValid(raw.userId)) {
    query.user = new mongoose.Types.ObjectId(raw.userId);
  }
  if (raw.action) query.action = raw.action;
  if (raw.entity) query.entity = raw.entity;
  if (raw.projectId && mongoose.Types.ObjectId.isValid(raw.projectId)) {
    query.$or = [
      {
        entity: "PROJECT",
        entityId: new mongoose.Types.ObjectId(raw.projectId),
      },
      { "metadata.projectId": String(raw.projectId) },
    ];
  }
  if (createdClause) query.createdAt = createdClause;

  const [logs, total] = await Promise.all([
    ActivityLog.find(query)
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(query),
  ]);

  const summaryAgg = await ActivityLog.aggregate([
    {
      $match: {
        organization: orgId,
        ...(createdClause ? { createdAt: createdClause } : {}),
      },
    },
    { $group: { _id: "$action", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);

  return {
    logs: logs.map((l) => ({
      id: String(l._id),
      actor: l.user
        ? { name: l.user.name, email: l.user.email, role: l.user.role }
        : null,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId ? String(l.entityId) : null,
      project:
        (l.metadata && (l.metadata.projectTitle || l.metadata.projectName)) ||
        null,
      metadata: l.metadata || {},
      createdAt: l.createdAt,
    })),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
    summary: {
      totalActivities: total,
      byAction: summaryAgg.map((a) => ({ action: a._id, count: a.count })),
    },
  };
}

// ─── Public: filter options ──────────────────────────────────────────────────

async function getFilterOptions(user) {
  const orgId = resolveOrg(user);
  const [projects, researchers] = await Promise.all([
    Project.find({ organization: orgId, isDeleted: false })
      .select("title status")
      .sort({ title: 1 })
      .lean(),
    User.find({
      organization: orgId,
      isDeleted: false,
      role: { $in: ["principal", "co-researcher", "coordinator"] },
    })
      .select("name email role")
      .sort({ name: 1 })
      .lean(),
  ]);
  return {
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
    statuses: ["planning", "in-progress", "completed"],
    types: REPORT_TYPES,
  };
}

// ─── Data bundle for exports ─────────────────────────────────────────────────

async function buildDataBundle(orgId, range, filters) {
  const createdClause = dateClause(range);

  const projectMatch = { organization: orgId, isDeleted: false };
  if (filters.projects.length) projectMatch._id = { $in: filters.projects };
  if (filters.statuses.length) projectMatch.status = { $in: filters.statuses };
  if (createdClause) projectMatch.createdAt = createdClause;

  const projects = await Project.find(projectMatch)
    .populate("coordinator", "name email")
    .sort({ createdAt: -1 })
    .lean();
  const projectIds = projects.map((p) => p._id);

  const taskMatch = {
    organization: orgId,
    isDeleted: false,
    project: { $in: projectIds },
  };
  if (filters.researchers.length) taskMatch.assignedTo = { $in: filters.researchers };
  if (createdClause) taskMatch.createdAt = createdClause;

  const tasks = await Task.find(taskMatch)
    .populate("assignedTo", "name email")
    .populate("project", "title")
    .sort({ createdAt: -1 })
    .lean();

  // Attach per-project task counts used by the Projects export sheet.
  const countMap = {};
  tasks.forEach((t) => {
    const k = String((t.project && t.project._id) || t.project);
    if (!countMap[k]) countMap[k] = { total: 0, done: 0 };
    countMap[k].total++;
    if (t.status === "done") countMap[k].done++;
  });
  projects.forEach((p) => {
    const c = countMap[String(p._id)] || { total: 0, done: 0 };
    p.totalTasks = c.total;
    p.completedTasks = c.done;
  });

  const deliverables = await TaskAttachment.find({
    project: { $in: projectIds },
    isDeleted: false,
  })
    .populate("project", "title")
    .populate("uploadedBy", "name email")
    .sort({ updatedAt: -1 })
    .lean();

  const users = await User.find({ organization: orgId, isDeleted: false })
    .select("name email role isActive createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const activityQuery = { organization: orgId };
  if (createdClause) activityQuery.createdAt = createdClause;
  const activityLogs = await ActivityLog.find(activityQuery)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return { projects, tasks, deliverables, users, activityLogs };
}

function defaultTitle(type) {
  const labels = {
    executive: "Executive Summary Report",
    "project-progress": "Project Progress Report",
    "deliverable-summary": "Deliverable Summary Report",
    "researcher-performance": "Researcher Performance Report",
    "activity-audit": "Activity Audit Report",
    "overdue-analysis": "Overdue Analysis Report",
  };
  return `${labels[type] || "Report"} — ${new Date().toLocaleDateString("en-US")}`;
}

// ─── Public: generate (PDF / Excel) ──────────────────────────────────────────

async function generateReport(user, format, payload = {}) {
  if (format !== "pdf" && format !== "excel") {
    throw new AppError(400, "Unsupported format. Use 'pdf' or 'excel'.");
  }
  const orgId = resolveOrg(user);
  const type = payload.type || "executive";
  if (!REPORT_TYPES.includes(type)) {
    throw new AppError(400, `Invalid report type: ${type}`);
  }

  const range = parseDateRange(payload);
  const filters = normalizeFilters(payload);

  const { metrics, projectIds } = await computeMetrics(orgId, range, filters);
  const charts = await computeCharts(orgId, projectIds, filters);
  const data = await buildDataBundle(orgId, range, filters);

  const reportsDir = path.join(__dirname, "..", "..", "uploads", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  const title = (payload.title && String(payload.title).trim()) || defaultTitle(type);
  const stamp = Date.now();
  const ctx = {
    title,
    type,
    description: payload.description || "",
    dateRange: range,
    metrics,
    charts,
    data,
    generatedBy: user.name || "Admin",
  };

  let pdfUrl = null;
  let excelUrl = null;
  if (format === "pdf") {
    const filename = `report-${type}-${stamp}.pdf`;
    await buildReportPdf(path.join(reportsDir, filename), ctx);
    pdfUrl = `/uploads/reports/${filename}`;
  } else {
    const filename = `report-${type}-${stamp}.xlsx`;
    await buildReportExcel(path.join(reportsDir, filename), ctx);
    excelUrl = `/uploads/reports/${filename}`;
  }

  const report = await Report.create({
    title,
    type,
    description: payload.description || "",
    organization: orgId,
    project: filters.projects.length === 1 ? filters.projects[0] : null,
    generatedBy: user.id || user.userId,
    dateRange: range,
    metrics,
    filters,
    generatedFile: { pdfUrl, excelUrl },
  });

  return Report.findById(report._id)
    .populate("generatedBy", "name email")
    .populate("project", "title")
    .lean();
}

// ─── Public: report history ──────────────────────────────────────────────────

async function getHistory(user, raw = {}) {
  const orgId = resolveOrg(user);
  const query = { organization: orgId, isDeleted: false };
  if (raw.type && REPORT_TYPES.includes(raw.type)) query.type = raw.type;

  const reports = await Report.find(query)
    .populate("generatedBy", "name email")
    .populate("project", "title")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return {
    reports: reports.map((r) => ({
      id: String(r._id),
      title: r.title,
      type: r.type,
      description: r.description,
      generatedBy: r.generatedBy
        ? { name: r.generatedBy.name, email: r.generatedBy.email }
        : null,
      project: r.project ? r.project.title : null,
      dateRange: r.dateRange,
      metrics: r.metrics,
      generatedFile: r.generatedFile,
      createdAt: r.createdAt,
    })),
  };
}

module.exports = {
  getOverview,
  getProjectsReport,
  getTasksReport,
  getActivityReport,
  getDeliverablesReport,
  getFilterOptions,
  generateReport,
  getHistory,
};
