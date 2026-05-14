const mongoose = require("mongoose");
const Project = require("../models/project");
const Task = require("../models/Task");
const User = require("../models/user");
const ProjectMember = require("../models/projectMember");
const { AppError } = require("../errors/AppError");
const activityLogService = require("./activityLogService");
const { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES } = require("../constants/activity");

function assertAdmin(actor) {
  if (actor.role !== "admin") {
    throw new AppError(403, "Admin access required");
  }
}

function calculateHealth(totalTasks, completedTasks, reviewTasks, overdueTasks) {
  if (totalTasks === 0) return "healthy";

  const completionRate = completedTasks / totalTasks;
  const reviewRate = reviewTasks / totalTasks;

  if (overdueTasks >= 3 && completionRate < 0.3) return "critical";
  if (reviewRate > 0.3) return "blocked";
  if (overdueTasks > 0) return "delayed";

  return "healthy";
}

// ─── getGovernanceData ─────────────────────────────────────────────────────

async function getGovernanceData(actor) {
  assertAdmin(actor);

  if (!actor.organization) return { projects: [] };

  const orgId = new mongoose.Types.ObjectId(actor.organization);
  const now = new Date();

  const projects = await Project.find({ organization: orgId, isDeleted: false })
    .populate({ path: "projectCoordinator", select: "name email role" })
    .populate({ path: "principalResearchers", select: "name email role" })
    .populate({ path: "coResearchers", select: "name email role" })
    .populate({ path: "createdBy", select: "name email role" })
    .sort({ updatedAt: -1 });

  const result = await Promise.all(
    projects.map(async (project) => {
      const tasks = await Task.find({
        project: project._id,
        organization: orgId,
        isDeleted: false,
      }).select("status dueDate assignedTo updatedAt");

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === "done").length;
      const reviewTasks = tasks.filter((t) => t.status === "review").length;
      const overdueTasks = tasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== "done" &&
          t.status !== "cancelled"
      ).length;

      const activeWorkers = [
        ...new Set(
          tasks
            .filter(
              (t) =>
                t.assignedTo &&
                ["in-progress", "review"].includes(t.status)
            )
            .map((t) => String(t.assignedTo))
        ),
      ].length;

      const taskLastActivity = tasks.reduce((latest, t) => {
        if (!latest) return t.updatedAt;
        return t.updatedAt > latest ? t.updatedAt : latest;
      }, null);

      const lastActivity = taskLastActivity
        ? taskLastActivity > project.updatedAt
          ? taskLastActivity
          : project.updatedAt
        : project.updatedAt;

      const health = calculateHealth(totalTasks, completedTasks, reviewTasks, overdueTasks);

      return {
        id: project._id.toString(),
        title: project.title,
        description: project.description || "",
        coordinator: project.projectCoordinator
          ? {
              id: project.projectCoordinator._id.toString(),
              name: project.projectCoordinator.name,
              email: project.projectCoordinator.email,
            }
          : null,
        status: project.status,
        progress: project.progress,
        health,
        totalTasks,
        completedTasks,
        reviewTasks,
        overdueTasks,
        activeWorkers,
        lastActivity,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    })
  );

  return { projects: result };
}

// ─── getProjectReport ──────────────────────────────────────────────────────

async function getProjectReport(actor, projectId) {
  assertAdmin(actor);

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new AppError(400, "Invalid project ID");
  }
  if (!actor.organization) {
    throw new AppError(400, "Organization context missing for this admin account");
  }

  const orgId = new mongoose.Types.ObjectId(actor.organization);
  const now = new Date();

  const project = await Project.findOne({
    _id: projectId,
    organization: orgId,
    isDeleted: false,
  })
    .populate({ path: "projectCoordinator", select: "name email role" })
    .populate({ path: "principalResearchers", select: "name email role" })
    .populate({ path: "coResearchers", select: "name email role" })
    .populate({ path: "createdBy", select: "name email role" });

  if (!project) throw new AppError(404, "Project not found");

  const tasks = await Task.find({
    project: project._id,
    organization: orgId,
    isDeleted: false,
  })
    .populate({ path: "assignedTo", select: "name email role" })
    .populate({ path: "createdBy", select: "name email role" });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const reviewTasks = tasks.filter((t) => t.status === "review").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
  const todoTasks = tasks.filter((t) => t.status === "todo").length;
  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
  const cancelledTasks = tasks.filter((t) => t.status === "cancelled").length;

  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < now &&
      t.status !== "done" &&
      t.status !== "cancelled"
  );

  const reviewBottlenecks = tasks.filter((t) => t.status === "review");

  // Workload distribution per user
  const workloadMap = {};
  for (const task of tasks) {
    if (task.assignedTo) {
      const uid = String(task.assignedTo._id);
      if (!workloadMap[uid]) {
        workloadMap[uid] = {
          user: {
            id: uid,
            name: task.assignedTo.name,
            email: task.assignedTo.email,
          },
          total: 0,
          done: 0,
          inProgress: 0,
          review: 0,
          overdue: 0,
        };
      }
      workloadMap[uid].total++;
      if (task.status === "done") workloadMap[uid].done++;
      if (task.status === "in-progress") workloadMap[uid].inProgress++;
      if (task.status === "review") workloadMap[uid].review++;
      if (
        task.dueDate &&
        new Date(task.dueDate) < now &&
        task.status !== "done" &&
        task.status !== "cancelled"
      ) {
        workloadMap[uid].overdue++;
      }
    }
  }

  const workloadDistribution = Object.values(workloadMap).sort(
    (a, b) => b.total - a.total
  );

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueRate =
    totalTasks > 0
      ? Math.round((overdueTasks.length / totalTasks) * 100)
      : 0;

  const health = calculateHealth(totalTasks, completedTasks, reviewTasks, overdueTasks.length);

  return {
    projectSummary: {
      id: project._id.toString(),
      title: project.title,
      description: project.description,
      objectives: project.objectives,
      status: project.status,
      progress: project.progress,
      health,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    coordinatorInfo: project.projectCoordinator
      ? {
          id: project.projectCoordinator._id.toString(),
          name: project.projectCoordinator.name,
          email: project.projectCoordinator.email,
          role: project.projectCoordinator.role,
        }
      : null,
    taskMetrics: {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      review: reviewTasks,
      todo: todoTasks,
      blocked: blockedTasks,
      cancelled: cancelledTasks,
      completionRate,
      overdueRate,
    },
    reviewBottlenecks: reviewBottlenecks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      priority: t.priority,
      assignedTo: t.assignedTo
        ? { name: t.assignedTo.name, email: t.assignedTo.email }
        : null,
      updatedAt: t.updatedAt,
    })),
    overdueAnalysis: {
      count: overdueTasks.length,
      tasks: overdueTasks.map((t) => ({
        id: t._id.toString(),
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        daysOverdue: Math.floor(
          (now - new Date(t.dueDate)) / (1000 * 60 * 60 * 24)
        ),
        assignedTo: t.assignedTo
          ? { name: t.assignedTo.name, email: t.assignedTo.email }
          : null,
        status: t.status,
      })),
    },
    workloadDistribution,
    completionPercentage: completionRate,
    timelinePerformance: {
      overdueRate,
      onTimeRate: 100 - overdueRate,
      totalWithDueDate: tasks.filter((t) => t.dueDate).length,
    },
  };
}

// ─── assignCoordinator ─────────────────────────────────────────────────────

async function assignCoordinator(actor, projectId, coordinatorId) {
  assertAdmin(actor);

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new AppError(400, "Invalid project ID");
  }
  if (!mongoose.Types.ObjectId.isValid(coordinatorId)) {
    throw new AppError(400, "Invalid coordinator ID");
  }

  const orgId = actor.organization;

  const project = await Project.findOne({
    _id: projectId,
    organization: orgId,
    isDeleted: false,
  });
  if (!project) throw new AppError(404, "Project not found");

  const coordUser = await User.findOne({
    _id: coordinatorId,
    organization: orgId,
    isDeleted: false,
  });
  if (!coordUser) throw new AppError(400, "Coordinator not found in your organization");
  if (coordUser.role !== "coordinator") {
    throw new AppError(400, "User must have the coordinator role to be assigned");
  }

  const previousCoordinator = project.projectCoordinator;
  project.projectCoordinator = coordinatorId;
  await project.save();

  await ProjectMember.deleteMany({ project: projectId, role: "COORDINATOR" });
  await ProjectMember.create({
    user: coordinatorId,
    project: projectId,
    role: "COORDINATOR",
    organization: orgId,
  });

  activityLogService
    .logActivity(
      actor.userId,
      ACTIVITY_ACTIONS.ASSIGN_PROJECT_COORDINATOR,
      ACTIVITY_ENTITIES.PROJECT,
      project._id,
      actor.organization,
      { previousCoordinatorId: previousCoordinator, newCoordinatorId: coordinatorId }
    )
    .catch(console.error);

  return {
    projectId: project._id.toString(),
    coordinator: {
      id: coordUser._id.toString(),
      name: coordUser.name,
      email: coordUser.email,
      role: coordUser.role,
    },
  };
}

module.exports = { getGovernanceData, getProjectReport, assignCoordinator };
