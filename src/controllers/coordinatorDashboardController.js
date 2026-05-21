const Project = require("../models/project");
const Task = require("../models/Task");
const User = require("../models/user");
const ActivityLog = require("../models/activityLog");
const mongoose = require("mongoose");
const { toTaskDTO } = require("../dtos/taskDto");

// Helper to get base query for assigned projects
const getAssignedProjectsQuery = (req) => {
  return {
    organization: req.user.organization,
    coordinator: req.user.userId,
    isDeleted: false,
  };
};

exports.getOverview = async (req, res) => {
  try {
    const projectsQuery = getAssignedProjectsQuery(req);
    const assignedProjects = await Project.countDocuments(projectsQuery);

    const assignedProjectDocs = await Project.find(projectsQuery).select('_id');
    const projectIds = assignedProjectDocs.map((p) => p._id);

    const baseTaskQuery = {
      organization: req.user.organization,
      project: { $in: projectIds },
      isDeleted: false,
    };

    const activeTasks = await Task.countDocuments({
      ...baseTaskQuery,
      status: { $in: ["todo", "in-progress"] },
    });

    const pendingReviews = await Task.countDocuments({
      ...baseTaskQuery,
      status: "review",
    });

    const overdueTasks = await Task.countDocuments({
      ...baseTaskQuery,
      status: { $ne: "done" },
      dueDate: { $lt: new Date() },
    });

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const completedThisWeek = await Task.countDocuments({
      ...baseTaskQuery,
      status: "done",
      updatedAt: { $gte: startOfWeek },
    });

    res.json({
      success: true,
      data: {
        assignedProjects,
        activeTasks,
        pendingReviews,
        overdueTasks,
        completedThisWeek,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching overview details" });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find(getAssignedProjectsQuery(req))
      .populate("principalResearchers coResearchers", "name email");

    const projectIds = projects.map(p => p._id);

    const tasksAggregation = await Task.aggregate([
      {
        $match: {
          organization: req.user.organization,
          project: { $in: projectIds },
          isDeleted: false,
        }
      },
      {
        $group: {
          _id: "$project",
          totalTasks: { $sum: 1 },
          reviewTasks: { $sum: { $cond: [{ $eq: ["$status", "review"] }, 1, 0] } },
          overdueTasks: {
            $sum: {
              $cond: [
                { $and: [{ $lt: ["$dueDate", new Date()] }, { $ne: ["$status", "done"] }] },
                1,
                0,
              ]
            }
          }
        }
      }
    ]);

    const taskStatsMap = tasksAggregation.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr;
      return acc;
    }, {});

    const enrichedProjects = projects.map(p => {
      const stats = taskStatsMap[p._id.toString()] || { totalTasks: 0, reviewTasks: 0, overdueTasks: 0 };
      return {
        _id: p._id,
        title: p.title,
        description: p.description,
        status: p.status,
        progress: p.progress,
        tasksCount: stats.totalTasks,
        reviewCount: stats.reviewTasks,
        overdueCount: stats.overdueTasks,
        activeMembers: p.principalResearchers.length + p.coResearchers.length,
      };
    });

    res.json({ success: true, data: enrichedProjects });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching projects" });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const assignedProjectDocs = await Project.find(getAssignedProjectsQuery(req)).select('_id title');
    const projectMap = assignedProjectDocs.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.title;
      return acc;
    }, {});
    const projectIds = assignedProjectDocs.map((p) => p._id);

    const reviewTasks = await Task.find({
      organization: req.user.organization,
      project: { $in: projectIds },
      status: "review",
      isDeleted: false,
    })
      .populate("assignedTo", "name email")
      .sort({ updatedAt: -1 });

    const groupedByProject = reviewTasks.reduce((acc, task) => {
      const projectId = task.project.toString();
      if (!acc[projectId]) {
        acc[projectId] = {
          projectId,
          projectName: projectMap[projectId] || "Unknown Project",
          tasks: [],
        };
      }
      acc[projectId].tasks.push({
        _id: task._id,
        title: task.title,
        assignedResearcher: task.assignedTo,
        submissionTime: task.updatedAt,
        priority: task.priority,
        dueDate: task.dueDate
      });
      return acc;
    }, {});

    res.json({ success: true, data: Object.values(groupedByProject) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching reviews" });
  }
};

exports.getWorkload = async (req, res) => {
  try {
    const assignedProjectDocs = await Project.find(getAssignedProjectsQuery(req)).select('_id');
    const projectIds = assignedProjectDocs.map((p) => p._id);

    const activeTasks = await Task.find({
      organization: req.user.organization,
      project: { $in: projectIds },
      isDeleted: false,
    }).populate("assignedTo", "name email");

    const statusCounts = { todo: 0, "in-progress": 0, review: 0, done: 0, blocked: 0, cancelled: 0 };
    const workloadDistribution = {};
    const dueSoonTasks = [];
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    activeTasks.forEach(task => {
      if (statusCounts[task.status] !== undefined) {
        statusCounts[task.status]++;
      }

      if (task.assignedTo) {
        const userId = task.assignedTo._id.toString();
        if (!workloadDistribution[userId]) {
          workloadDistribution[userId] = {
            member: task.assignedTo,
            taskCount: 0
          };
        }
        if (task.status !== 'done' && task.status !== 'cancelled') {
           workloadDistribution[userId].taskCount++;
        }
      }

      if (task.dueDate && task.status !== 'done' && task.dueDate > now && task.dueDate <= threeDaysFromNow) {
        dueSoonTasks.push({
          _id: task._id,
          title: task.title,
          dueDate: task.dueDate,
          assignedTo: task.assignedTo
        });
      }
    });

    res.json({
      success: true,
      data: {
        tasksByStatus: statusCounts,
        workloadDistribution: Object.values(workloadDistribution),
        dueSoonTasks: dueSoonTasks.sort((a, b) => a.dueDate - b.dueDate)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching workload" });
  }
};

exports.getProjectOverview = async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const project = await Project.findOne({
      _id: projectId,
      organization: req.user.organization,
      coordinator: req.user.userId,
      isDeleted: false,
    }).populate("coordinator principalResearchers coResearchers", "name email role");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found or not assigned to you" });
    }

    const tasks = await Task.find({
      organization: req.user.organization,
      project: projectId,
      isDeleted: false,
    }).populate("assignedTo", "name email");

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
    const reviewTasks = tasks.filter((t) => t.status === "review").length;
    
    const now = new Date();
    const overdueTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled" && t.dueDate && new Date(t.dueDate) < now);
    const dueThisWeekTasks = tasks.filter((t) => {
      if (t.status === "done" || t.status === "cancelled" || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return due >= now && due <= endOfWeek;
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Build workload for researchers
    const allResearchers = [...(project.principalResearchers || []), ...(project.coResearchers || [])];
    const workloadDistribution = allResearchers.map((researcher) => {
      const researcherTasks = tasks.filter((t) => String(t.assignedTo?._id) === String(researcher._id));
      const total = researcherTasks.length;
      const completed = researcherTasks.filter((t) => t.status === "done").length;
      return {
        user: { _id: researcher._id, name: researcher.name, email: researcher.email, role: researcher.role },
        taskCount: total,
        completedCount: completed,
        completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    const pendingReviews = tasks.filter((t) => t.status === "review").map((t) => ({
      _id: t._id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
      assignedResearcher: t.assignedTo,
      submissionTime: t.updatedAt,
    }));

    // Fetch recent activity logs for the project and its tasks
    const taskIds = tasks.map(t => t._id);

    const [projectLogs, taskLogs] = await Promise.all([
      ActivityLog.find({ entityId: projectId, organization: req.user.organization })
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .limit(10),
      ActivityLog.find({ entityId: { $in: taskIds }, organization: req.user.organization })
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const allLogs = [...projectLogs, ...taskLogs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 15)
      .map(log => ({
        _id: log._id,
        action: log.action,
        actorName: log.user?.name || "System",
        createdAt: log.createdAt,
      }));

    res.json({
      success: true,
      data: {
        project: {
          _id: project._id,
          title: project.title,
          description: project.description,
          status: project.status,
          progress: project.progress,
          startDate: project.startDate,
          endDate: project.endDate,
          createdAt: project.createdAt,
          coordinator: project.coordinator,
          principalResearchers: project.principalResearchers,
          coResearchers: project.coResearchers,
        },
        metrics: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          reviewTasks,
          overdueCount: overdueTasks.length,
          activeResearchers: workloadDistribution.filter(w => w.taskCount > 0).length,
          completionRate,
        },
        pendingReviews,
        deadlines: {
          overdue: overdueTasks.map(t => ({ _id: t._id, title: t.title, dueDate: t.dueDate, assignedTo: t.assignedTo })),
          dueThisWeek: dueThisWeekTasks.map(t => ({ _id: t._id, title: t.title, dueDate: t.dueDate, assignedTo: t.assignedTo }))
        },
        workloadDistribution,
        recentActivity: allLogs
      }
    });

  } catch (error) {
    console.error("Error fetching project overview:", error);
    res.status(500).json({ success: false, message: "Error fetching project overview details" });
  }
};

exports.getProjectKanban = async (req, res) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const project = await Project.findOne({
      _id: projectId,
      organization: req.user.organization,
      coordinator: req.user.userId,
      isDeleted: false,
    }).populate("coordinator principalResearchers coResearchers");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found or unauthorized" });
    }

    const tasks = await Task.find({
      project: projectId,
      organization: req.user.organization,
      isDeleted: false,
    }).populate("assignedTo createdBy").populate({
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
    });

    // Compute metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
    const reviewTasks = tasks.filter((t) => t.status === "review").length;
    const changesRequestedTasks = tasks.filter((t) => t.status === "changes-requested").length;
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
    );

    const metrics = {
      totalTasks,
      completedTasks,
      inProgressTasks,
      reviewTasks,
      changesRequestedTasks,
      overdueCount: overdueTasks.length,
    };

    // Serialize tasks with full deliverable data
    const serializedTasks = tasks.map(t => toTaskDTO(t));

    // Columns
    const columns = {
      todo: serializedTasks.filter(t => t.status === "todo"),
      "in-progress": serializedTasks.filter(t => t.status === "in-progress"),
      review: serializedTasks.filter(t => t.status === "review"),
      "changes-requested": serializedTasks.filter(t => t.status === "changes-requested"),
      done: serializedTasks.filter(t => t.status === "done"),
    };

    const pendingReviews = serializedTasks.filter(t => t.status === "review");

    res.json({
      success: true,
      data: {
        project,
        metrics,
        columns,
        pendingReviews,
        overdueTasks: overdueTasks.map(t => ({
          _id: t._id,
          title: t.title,
          dueDate: t.dueDate,
          assignedTo: t.assignedTo,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching project kanban:", error);
    res.status(500).json({ success: false, message: "Error fetching project kanban details" });
  }
};
