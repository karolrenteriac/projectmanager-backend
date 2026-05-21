const mongoose = require("mongoose");
const Project = require("../models/project");
const Task = require("../models/task");

// Resolve the current admin's organization as an ObjectId filter.
// Every query must be scoped to this org to prevent cross-org data leakage.
function buildOrgScope(req) {
  const org = req.user?.organization;
  if (!org) return {};
  return { organization: new mongoose.Types.ObjectId(org) };
}


// =============================
// 📊 SUMMARY (KPI CARDS)
// =============================
exports.getSummary = async (req, res) => {
  try {
    const orgScope = buildOrgScope(req);

    // All active projects scoped to this organization
    const activeProjects = await Project.find({
      ...orgScope,
      isDeleted: false,
    }).select("progress principalResearchers coResearchers coordinator createdBy");

    const totalProjects = activeProjects.length;

    // IDs used to cascade filtering down to tasks — prevents orphaned-task leakage
    const activeProjectIds = activeProjects.map((p) => p._id);

    // Tasks: own isDeleted guard + must belong to a live project
    const totalTasks = await Task.countDocuments({
      isDeleted: false,
      project: { $in: activeProjectIds },
    });

    // Active users: every distinct participant across this org's active projects
    const userIdSet = new Set();
    activeProjects.forEach((p) => {
      if (p.coordinator) userIdSet.add(p.coordinator.toString());
      if (p.createdBy)   userIdSet.add(p.createdBy.toString());
      p.principalResearchers.forEach((u) => userIdSet.add(u.toString()));
      p.coResearchers.forEach((u) => userIdSet.add(u.toString()));
    });
    const activeUsers = userIdSet.size;

    // Progress: simple average of the progress field on active projects
    let progress = 0;
    if (activeProjects.length > 0) {
      const sum = activeProjects.reduce((acc, p) => acc + (p.progress || 0), 0);
      progress = Math.round(sum / activeProjects.length);
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
// 📈 PROJECT & TASK PROGRESS (LINE CHART)
// =============================
exports.getProgress = async (req, res) => {
  try {
    const orgScope = buildOrgScope(req);

    const projects = await Project.find({ ...orgScope, isDeleted: false });
    const activeProjectIds = projects.map((p) => p._id);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const projectProgress = new Array(months.length).fill(0);
    const projectCount    = new Array(months.length).fill(0);

    projects.forEach((project) => {
      const month = new Date(project.createdAt).getMonth();
      if (month < months.length) {
        projectProgress[month] += project.progress || 0;
        projectCount[month]++;
      }
    });

    const finalProgress = projectProgress.map((total, i) =>
      projectCount[i] > 0 ? Math.round(total / projectCount[i]) : 0
    );

    // "Done" is the correct completed-task status in this schema
    const doneTasks = await Task.find({
      status: "done",
      isDeleted: false,
      project: { $in: activeProjectIds },
    }).select("createdAt");

    const tasksCompleted = new Array(months.length).fill(0);
    doneTasks.forEach((task) => {
      const month = new Date(task.createdAt).getMonth();
      if (month < months.length) tasksCompleted[month]++;
    });

    res.json({ months, projectProgress: finalProgress, tasksCompleted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


// =============================
// 🟣 TASK DISTRIBUTION (DONUT CHART)
// =============================
exports.getTaskDistribution = async (req, res) => {
  try {
    const orgScope = buildOrgScope(req);

    const activeProjectIds = await Project.distinct("_id", {
      ...orgScope,
      isDeleted: false,
    });

    const base = { isDeleted: false, project: { $in: activeProjectIds } };

    const [done, todo, inProgress] = await Promise.all([
      Task.countDocuments({ ...base, status: "done" }),
      Task.countDocuments({ ...base, status: "todo" }),
      Task.countDocuments({ ...base, status: "in-progress" }),
    ]);

    res.json({
      labels: ["Completed", "Pending", "In Progress"],
      data: [done, todo, inProgress],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


// =============================
// 🟢 USER ACTIVITY (BAR CHART)
// =============================
exports.getUserActivity = async (req, res) => {
  try {
    const orgScope = buildOrgScope(req);

    const activeProjectIds = await Project.distinct("_id", {
      ...orgScope,
      isDeleted: false,
    });

    const tasks = await Task.find({
      isDeleted: false,
      project: { $in: activeProjectIds },
    }).select("createdAt");

    const days     = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const activity = [0, 0, 0, 0, 0, 0, 0];

    tasks.forEach((task) => {
      let day = new Date(task.createdAt).getDay();
      day = day === 0 ? 6 : day - 1; // shift Sun (0) to index 6
      activity[day]++;
    });

    res.json({ labels: days, data: activity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
