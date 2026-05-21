const mongoose = require("mongoose");
const Task = require("../models/Task");
const Project = require("../models/project");
const { toTaskDTO } = require("../dtos/taskDto");

const populateOptions = [
  { path: "assignedTo", select: "name email role" },
  { path: "project", select: "title status", match: { isDeleted: false } },
  { path: "createdBy", select: "name email role" },
  { path: "attachments.uploadedBy", select: "name email" },
  { path: "comments.author", select: "name email" },
  { path: "checklist.completedBy", select: "name email" },
  { path: "reviewedBy", select: "name email" },
  { path: "reviewHistory.reviewedBy", select: "name email" },
  { path: "reviewHistory.rejectedBy", select: "name email" },
  {
    path: "deliverables",
    populate: [
      { path: "uploadedBy", select: "name email" },
      {
        path: "versions",
        populate: [
          { path: "uploadedBy", select: "name email" },
          { path: "reviewedBy", select: "name email" },
          { path: "rejectedBy", select: "name email" },
          { path: "approvedBy", select: "name email" },
        ],
      },
      {
        path: "latestVersion",
        populate: [
          { path: "uploadedBy", select: "name email" },
          { path: "reviewedBy", select: "name email" },
          { path: "rejectedBy", select: "name email" },
          { path: "approvedBy", select: "name email" },
        ],
      },
    ],
  },
];

/**
 * Canonical personal task scope: only tasks directly assigned to the actor.
 * Applies to ALL roles using this workspace (principal, co-researcher, fallback).
 * Principal's project-supervision data lives in the Principal Dashboard, NOT here.
 */
const getResearcherTasksQuery = (req) => {
  const { userId, organization } = req.user;
  return { organization, isDeleted: false, assignedTo: userId };
};

// 1. GET /api/my-tasks
exports.getMyTasks = async (req, res, next) => {
  try {
    const query = getResearcherTasksQuery(req);
    const tasks = await Task.find(query)
      .populate(populateOptions)
      .sort({ createdAt: -1 });

    // Filter out tasks with deleted projects (will be null from populate)
    const validTasks = tasks.filter(t => t.project !== null);
    const dtos = validTasks.map((t) => toTaskDTO(t));
    res.json({ tasks: dtos });
  } catch (err) {
    next(err);
  }
};

// 2. GET /api/my-tasks/calendar
exports.getMyTasksCalendar = async (req, res, next) => {
  try {
    const query = getResearcherTasksQuery(req);
    const tasks = await Task.find(query)
      .populate(populateOptions)
      .sort({ dueDate: 1, createdAt: -1 });

    // Filter out tasks with deleted projects (will be null from populate)
    const validTasks = tasks.filter(t => t.project !== null);
    const dtos = validTasks.map((t) => toTaskDTO(t));
    res.json({ tasks: dtos });
  } catch (err) {
    next(err);
  }
};

// 3. GET /api/my-tasks/overview
exports.getMyTasksOverview = async (req, res, next) => {
  try {
    const query = getResearcherTasksQuery(req);
    const tasks = await Task.find(query);

    const overview = {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      pendingReview: tasks.filter((t) => t.status === "review").length,
      changesRequested: tasks.filter((t) => t.status === "changes-requested").length,
      completed: tasks.filter((t) => t.status === "done").length,
    };

    res.json({ overview });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. GET /api/my-tasks/workspace/projects
 * Returns all projects in which the logged-in user has at least one assigned task,
 * together with per-project task stats scoped strictly to that user.
 */
exports.getMyWorkspaceProjects = async (req, res, next) => {
  try {
    const { userId, organization } = req.user;

    const taskAggs = await Task.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(organization),
          assignedTo: new mongoose.Types.ObjectId(userId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$project",
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
          pendingReviews: {
            $sum: { $cond: [{ $eq: ["$status", "review"] }, 1, 0] },
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", new Date()] },
                    { $not: { $in: ["$status", ["done", "cancelled"]] } },
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

    const projectIds = taskAggs.map((a) => a._id);

    const projects = await Project.find({ _id: { $in: projectIds }, isDeleted: false })
      .populate("coordinator", "name email")
      .select("title description status progress startDate endDate coordinator");

    const statsMap = taskAggs.reduce((acc, a) => {
      acc[a._id.toString()] = a;
      return acc;
    }, {});

    const data = projects.map((p) => {
      const stats = statsMap[p._id.toString()] || {};
      return {
        _id: p._id,
        title: p.title,
        description: p.description,
        status: p.status,
        progress: p.progress,
        startDate: p.startDate,
        endDate: p.endDate,
        coordinator: p.coordinator,
        totalTasks: stats.totalTasks || 0,
        completedTasks: stats.completedTasks || 0,
        pendingReviews: stats.pendingReviews || 0,
        overdueTasks: stats.overdueTasks || 0,
      };
    });

    res.json({ projects: data });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. GET /api/my-tasks/workspace/projects/:projectId/tasks
 * Returns ONLY tasks assigned to the logged-in user inside the given project.
 */
exports.getMyProjectTasks = async (req, res, next) => {
  try {
    const { userId, organization } = req.user;
    const { projectId } = req.params;

    const tasks = await Task.find({
      organization,
      project: projectId,
      assignedTo: userId,
      isDeleted: false,
    })
      .populate(populateOptions)
      .sort({ createdAt: -1 });

    const dtos = tasks.map((t) => toTaskDTO(t));
    res.json({ tasks: dtos });
  } catch (err) {
    next(err);
  }
};
