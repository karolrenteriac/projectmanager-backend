const mongoose = require("mongoose");
const Project = require("../models/project");
const Task = require("../models/Task");

/**
 * Get all projects where the logged-in user is an assigned Principal Researcher.
 * Used to scope project-related data on the Principal dashboard.
 */
const getPrincipalProjects = async (req) => {
  const { userId, organization } = req.user;
  return Project.find({
    organization,
    principalResearchers: userId,
    isDeleted: false,
  }).select("_id");
};

/**
 * Build the canonical task-scope query for the Principal Dashboard.
 *
 * BUSINESS RULE — STRICT PERSONAL EXECUTION SCOPE:
 *   The Principal Dashboard shows ONLY tasks assigned directly to the logged-in
 *   Principal. It is a PERSONAL execution dashboard, NOT a team analytics or
 *   project supervision dashboard.
 *
 * MUST NOT include:
 *   - co-researcher tasks
 *   - teammate tasks
 *   - project-wide totals
 *   - organization-wide totals
 */
const buildPrincipalTaskQuery = (req, _projectIds, extra = {}) => {
  const { userId, organization } = req.user;
  return {
    organization,
    isDeleted: false,
    assignedTo: userId,
    ...extra,
  };
};

exports.getOverview = async (req, res) => {
  try {
    const { organization } = req.user;
    const projects = await getPrincipalProjects(req);
    const projectIds = projects.map((p) => p._id);

    // Restrict every counter to tasks whose parent project is still alive,
    // so KPI counts stay consistent with /activity (which strips orphans).
    const aliveProjects = await Project.find({ organization, isDeleted: false }).select("_id");
    const aliveProjectIds = aliveProjects.map((p) => p._id);

    // Principal-scoped base query: ONLY tasks directly assigned to this Principal
    // AND whose project is not soft-deleted.
    const baseQuery = {
      ...buildPrincipalTaskQuery(req, projectIds),
      project: { $in: aliveProjectIds },
    };

    const [
      activeProjects, teamTasks, inProgressTasks, pendingReviews,
      changesRequestedTasks, overdueTasks, completedTasks,
    ] = await Promise.all([
      Promise.resolve(projectIds.length),
      Task.countDocuments(baseQuery),
      Task.countDocuments({ ...baseQuery, status: "in-progress" }),
      Task.countDocuments({ ...baseQuery, status: "review" }),
      Task.countDocuments({ ...baseQuery, status: "changes-requested" }),
      Task.countDocuments({
        ...baseQuery,
        status: { $nin: ["done", "cancelled"] },
        dueDate: { $lt: new Date() },
      }),
      Task.countDocuments({ ...baseQuery, status: "done" }),
    ]);

    res.json({
      success: true,
      data: {
        activeProjects, teamTasks, inProgressTasks,
        pendingReviews, changesRequestedTasks, overdueTasks, completedTasks,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching principal overview" });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const { userId, organization } = req.user;

    // Get only projects where the user is a principal researcher and NOT deleted
    const projects = await Project.find({
      organization,
      principalResearchers: userId,
      isDeleted: false,
    })
      .populate({
        path: "coordinator",
        select: "name email",
        match: { isDeleted: false }
      })
      .populate({
        path: "principalResearchers coResearchers",
        select: "name email",
        match: { isDeleted: false }
      });

    const projectIds = projects.map((p) => p._id);

    // Aggregate task stats only for non-deleted projects and non-deleted tasks
    const taskStats = await Task.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(req.user.organization),
          project: { $in: projectIds },
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "projectData",
          pipeline: [{ $match: { isDeleted: false } }],
        },
      },
      {
        $match: {
          projectData: { $ne: [] }, // Only include if project not deleted
        },
      },
      {
        $group: {
          _id: "$project",
          totalTasks: { $sum: 1 },
          pendingTasks: {
            $sum: { $cond: [{ $in: ["$status", ["todo", "in-progress"]] }, 1, 0] },
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", new Date()] },
                    { $nin: ["$status", ["done", "cancelled"]] },
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

    const taskMap = taskStats.reduce((acc, t) => {
      acc[t._id.toString()] = t;
      return acc;
    }, {});

    const data = projects.map((p) => {
      const stats = taskMap[p._id.toString()] || { totalTasks: 0, pendingTasks: 0, overdueTasks: 0 };
      return {
        _id: p._id,
        title: p.title,
        description: p.description,
        status: p.status,
        progress: p.progress,
        startDate: p.startDate,
        endDate: p.endDate,
        coordinator: p.coordinator,
        coResearchers: p.coResearchers,
        totalTasks: stats.totalTasks,
        pendingTasks: stats.pendingTasks,
        overdueTasks: stats.overdueTasks,
        activeResearchers: p.coResearchers?.length || 0,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching principal projects:", error);
    res.status(500).json({ success: false, message: "Error fetching principal projects" });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const { organization } = req.user;
    const projects = await getPrincipalProjects(req);
    const projectIds = projects.map((p) => p._id);

    // Pre-filter to alive projects so activity stays consistent with overview KPIs
    const aliveProjects = await Project.find({ organization, isDeleted: false }).select("_id");
    const aliveProjectIds = aliveProjects.map((p) => p._id);

    const query = {
      ...buildPrincipalTaskQuery(req, projectIds),
      project: { $in: aliveProjectIds },
    };

    const recentTasks = await Task.find(query)
      .populate({ path: "assignedTo", select: "name email" })
      .populate({ path: "project", select: "title", match: { isDeleted: false } })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("title status dueDate priority assignedTo project updatedAt");

    // Defensive: drop any task whose project resolved to null (race-condition safe)
    const validTasks = recentTasks.filter((t) => t.project !== null);

    const data = validTasks.map((t) => ({
      _id: t._id,
      type:
        t.status === "review"
          ? "review_requested"
          : t.status === "done"
          ? "task_completed"
          : t.status === "changes-requested"
          ? "changes_requested"
          : "task_updated",
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      project: t.project,
      assignedTo: t.assignedTo,
      updatedAt: t.updatedAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching activity" });
  }
};

exports.getWorkload = async (req, res) => {
  try {
    const projects = await getPrincipalProjects(req);
    const projectIds = projects.map((p) => p._id);

    // Principal-scoped: ONLY Principal's own assigned tasks (not team metrics)
    // NOTE: Principal Dashboard is a PERSONAL execution dashboard.
    // Team supervision/workload is handled by Coordinator Dashboard.
    const activeTasks = await Task.find(
      buildPrincipalTaskQuery(req, projectIds)
    ).populate("assignedTo", "name email role");

    // Since we're only looking at Principal's own tasks,
    // workloadDistribution will only show the Principal themselves
    const workloadMap = {};
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoonTasks = [];

    activeTasks.forEach((task) => {
      if (task.assignedTo) {
        const uid = task.assignedTo._id.toString();
        if (!workloadMap[uid]) {
          workloadMap[uid] = {
            member: task.assignedTo,
            taskCount: 0,
            completed: 0,
            overdue: 0,
          };
        }
        workloadMap[uid].taskCount++;
        if (task.status === "done") workloadMap[uid].completed++;
        if (
          task.dueDate &&
          new Date(task.dueDate) < now &&
          !["done", "cancelled"].includes(task.status)
        ) {
          workloadMap[uid].overdue++;
        }
      }

      if (
        task.dueDate &&
        new Date(task.dueDate) >= now &&
        new Date(task.dueDate) <= sevenDaysFromNow &&
        !["done", "cancelled"].includes(task.status)
      ) {
        dueSoonTasks.push(task);
      }
    });

    dueSoonTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.json({
      success: true,
      data: {
        workloadDistribution: Object.values(workloadMap),
        dueSoonTasks: dueSoonTasks.slice(0, 8),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching personal workload" });
  }
};
