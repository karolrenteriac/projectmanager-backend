const Project = require("../models/project");
const Task = require("../models/Task");
const User = require("../models/user");
const Invitation = require("../models/invitation");
const ActivityLog = require("../models/activityLog");


// =============================
// 📊 SUMMARY (CARDS)
// =============================
exports.getSummary = async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments({ isDeleted: false });
    const totalTasks = await Task.countDocuments({ isDeleted: false });
    const activeUsers = await User.countDocuments({ isDeleted: false });

    const projects = await Project.find({ isDeleted: false });

    let progress = 0;
    if (projects.length > 0) {
      const totalProgress = projects.reduce(
        (acc, p) => acc + (p.progress || 0),
        0
      );
      progress = Math.round(totalProgress / projects.length);
    }

    res.json({
      totalProjects,
      totalTasks,
      activeUsers,
      progress,
      projectsTrend: 0,
      tasksTrend: 0,
      usersTrend: 0,
      progressTrend: 0,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// =============================
// 🔔 NOTIFICATIONS
// =============================
exports.getNotifications = async (req, res) => {
  try {
    const notifications = [];

    // Invitaciones pendientes
    const pendingInvitations = await Invitation.countDocuments({
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (pendingInvitations > 0) {
      notifications.push({
        type: "invitation",
        message: `${pendingInvitations} pending invitations`,
        icon: "mail",
        color: "blue",
      });
    }

    // Tareas pendientes
    const pendingTasks = await Task.countDocuments({
      status: "pending",
      isDeleted: false,
    });

    if (pendingTasks > 0) {
      notifications.push({
        type: "task",
        message: `${pendingTasks} pending tasks`,
        icon: "warning",
        color: "red",
      });
    }

    // Última actividad
    const recentActivity = await ActivityLog.findOne()
      .sort({ createdAt: -1 })
      .populate("user");

    if (recentActivity) {
      notifications.push({
        type: "message",
        message: `New activity: ${recentActivity.action} in ${recentActivity.entity}`,
        icon: "chat",
        color: "green",
      });
    }

    res.json(notifications);
  } catch (error) {
    console.error("Dashboard notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// =============================
// 📈 PROJECT & TASK PROGRESS
// =============================
exports.getProgress = async (req, res) => {
  try {
    const projects = await Project.find({ isDeleted: false });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

    const projectProgress = new Array(months.length).fill(0);
    const projectCount = new Array(months.length).fill(0);

    projects.forEach((project) => {
      const date = new Date(project.createdAt);
      const month = date.getMonth();

      if (month < months.length) {
        projectProgress[month] += project.progress || 0;
        projectCount[month]++;
      }
    });

    const finalProgress = projectProgress.map((total, i) =>
      projectCount[i] > 0 ? Math.round(total / projectCount[i]) : 0
    );

    const tasks = await Task.find({
      status: "completed",
      isDeleted: false,
    });

    const tasksCompleted = new Array(months.length).fill(0);

    tasks.forEach((task) => {
      const date = new Date(task.createdAt);
      const month = date.getMonth();

      if (month < months.length) {
        tasksCompleted[month]++;
      }
    });

    console.log("REAL PROGRESS:", finalProgress, tasksCompleted);

    res.json({
      months,
      projectProgress: finalProgress,
      tasksCompleted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


// =============================
// 🟣 TASK DISTRIBUTION
// =============================
exports.getTaskDistribution = async (req, res) => {
  try {
    const completed = await Task.countDocuments({
      status: "completed",
      isDeleted: false,
    });

    const pending = await Task.countDocuments({
      status: "pending",
      isDeleted: false,
    });

    const inProgress = await Task.countDocuments({
      status: "in-progress",
      isDeleted: false,
    });

    console.log("REAL TASKS:", { completed, pending, inProgress });

    res.json({
      labels: ["Completed", "Pending", "In Progress"],
      data: [completed, pending, inProgress],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


// =============================
// 🟢 USER ACTIVITY
// =============================
exports.getUserActivity = async (req, res) => {
  try {
    const tasks = await Task.find({ isDeleted: false });

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const activity = [0, 0, 0, 0, 0, 0, 0];

    tasks.forEach((task) => {
      const date = new Date(task.createdAt);
      let day = date.getDay();

      day = day === 0 ? 6 : day - 1;

      activity[day]++;
    });

    console.log("REAL ACTIVITY:", activity);

    res.json({
      labels: days,
      data: activity,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};