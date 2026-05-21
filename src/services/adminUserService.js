const mongoose = require("mongoose");
const User = require("../models/user");
const Project = require("../models/project");
const Task = require("../models/task");
const { AppError } = require("../errors/AppError");

const VALID_ROLES = ["admin", "coordinator", "principal", "co-researcher"];

function assertAdmin(actor) {
  if (actor.role !== "admin") {
    throw new AppError(403, "Admin access required");
  }
}

// ─── getUsers ──────────────────────────────────────────────────────────────

/**
 * Paginated, filtered user list with task/project stats.
 * Also returns overall org stats (role breakdown, active count).
 */
async function getUsers(actor, { search = "", role = "", active = "", page = 1, limit = 20 } = {}) {
  assertAdmin(actor);

  if (!actor.organization) {
    throw new AppError(400, "User has no organization assigned");
  }

  const PAGE  = Math.max(1, parseInt(page)  || 1);
  const LIMIT = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const SKIP  = (PAGE - 1) * LIMIT;

  const orgId = new mongoose.Types.ObjectId(actor.organization);

  // ── Build filtered match stage ────────────────────────────────────────────
  const matchStage = { organization: orgId, isDeleted: false };

  if (role && VALID_ROLES.includes(role)) matchStage.role = role;

  if (active === "true")  matchStage.isActive = true;
  if (active === "false") matchStage.isActive = { $ne: true }; // catches false and undefined (legacy docs)

  if (search && search.trim()) {
    const esc = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    matchStage.$or = [
      { name:  { $regex: esc, $options: "i" } },
      { email: { $regex: esc, $options: "i" } },
    ];
  }

  // ── Aggregate: filtered list + overall org stats in one trip ──────────────
  const [result] = await User.aggregate([
    { $match: matchStage },

    // Lookup tasks assigned to this user
    {
      $lookup: {
        from: "tasks",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$assignedTo", null] },
                  { $eq: ["$assignedTo", "$$uid"] },
                  { $ne: ["$isDeleted", true] },
                ],
              },
            },
          },
          { $project: { status: 1 } },
        ],
        as: "_tasks",
      },
    },

    // Lookup projects where user is projectCoordinator
    {
      $lookup: {
        from: "projects",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$projectCoordinator", "$$uid"] },
                  { $ne: ["$isDeleted", true] },
                ],
              },
            },
          },
          { $project: { _id: 1 } },
        ],
        as: "_coordinatedProjects",
      },
    },

    // Lookup projects where user is a principalResearcher or coResearcher
    // $ifNull guards prevent $in crash when arrays are null/missing in legacy docs
    {
      $lookup: {
        from: "projects",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $or: [
                      { $in: ["$$uid", { $ifNull: ["$principalResearchers", []] }] },
                      { $in: ["$$uid", { $ifNull: ["$coResearchers", []] }] },
                    ],
                  },
                  { $ne: ["$isDeleted", true] },
                ],
              },
            },
          },
          { $project: { _id: 1 } },
        ],
        as: "_memberProjects",
      },
    },

    // Compute derived stats
    {
      $addFields: {
        assignedTasksCount: { $size: { $ifNull: ["$_tasks", []] } },
        completedTasksCount: {
          $size: {
            $filter: { input: { $ifNull: ["$_tasks", []] }, as: "t", cond: { $eq: ["$$t.status", "done"] } },
          },
        },
        reviewTasksCount: {
          $size: {
            $filter: { input: { $ifNull: ["$_tasks", []] }, as: "t", cond: { $eq: ["$$t.status", "review"] } },
          },
        },
        coordinatedProjectsCount: { $size: { $ifNull: ["$_coordinatedProjects", []] } },
        memberProjectsCount: { $size: { $ifNull: ["$_memberProjects", []] } },
        _isActive: { $ifNull: ["$isActive", true] },
      },
    },

    // Strip internal lookup arrays and password
    {
      $project: {
        password: 0,
        _tasks: 0,
        _coordinatedProjects: 0,
        _memberProjects: 0,
      },
    },

    { $sort: { name: 1 } },

    // Paginate + count in one pass
    {
      $facet: {
        data:  [{ $skip: SKIP }, { $limit: LIMIT }],
        total: [{ $count: "count" }],
      },
    },
  ]);

  // ── Overall org stats (separate fast query — no joins, no filter) ─────────
  const overallStats = await User.aggregate([
    { $match: { organization: orgId, isDeleted: false } },
    {
      $group: {
        _id: "$role",
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $ne: ["$isActive", false] }, 1, 0] } },
      },
    },
  ]);

  const statsByRole = overallStats.reduce((acc, s) => {
    acc[s._id] = { total: s.total, active: s.active };
    return acc;
  }, {});

  const totalOrgUsers  = overallStats.reduce((s, r) => s + r.total,  0);
  const activeOrgUsers = overallStats.reduce((s, r) => s + r.active, 0);

  const users = (result?.data || []).map((u) => ({
    id:                       u._id.toString(),
    name:                     u.name,
    email:                    u.email,
    role:                     u.role,
    isActive:                 u._isActive,
    createdAt:                u.createdAt,
    assignedTasksCount:       u.assignedTasksCount,
    completedTasksCount:      u.completedTasksCount,
    reviewTasksCount:         u.reviewTasksCount,
    coordinatedProjectsCount: u.coordinatedProjectsCount,
    memberProjectsCount:      u.memberProjectsCount,
    assignedProjectsCount:    u.coordinatedProjectsCount + u.memberProjectsCount,
  }));

  return {
    users,
    pagination: {
      total: result?.total?.[0]?.count || 0,
      page:  PAGE,
      limit: LIMIT,
      pages: Math.ceil((result?.total?.[0]?.count || 0) / LIMIT),
    },
    stats: {
      totalUsers:    totalOrgUsers,
      activeUsers:   activeOrgUsers,
      inactiveUsers: totalOrgUsers - activeOrgUsers,
      byRole: {
        admin:          statsByRole["admin"]          || { total: 0, active: 0 },
        coordinator:    statsByRole["coordinator"]    || { total: 0, active: 0 },
        principal:      statsByRole["principal"]      || { total: 0, active: 0 },
        "co-researcher": statsByRole["co-researcher"] || { total: 0, active: 0 },
      },
    },
  };
}

// ─── getUserById ───────────────────────────────────────────────────────────

async function getUserById(actor, userId) {
  assertAdmin(actor);

  if (!actor.organization) {
    throw new AppError(400, "User has no organization assigned");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError(400, "Invalid user ID");

  const orgId = new mongoose.Types.ObjectId(actor.organization);
  const uid   = new mongoose.Types.ObjectId(userId);

  const user = await User.findOne({
    _id: uid,
    organization: orgId,
    isDeleted: false,
  }).select("-password");

  if (!user) throw new AppError(404, "User not found");

  const [coordinatedProjects, memberProjects, taskStats] = await Promise.all([
    Project.find({ projectCoordinator: uid, organization: orgId, isDeleted: false })
      .select("title status progress")
      .sort({ updatedAt: -1 })
      .limit(20),

    Project.find({
      $or: [{ principalResearchers: uid }, { coResearchers: uid }],
      organization: orgId,
      isDeleted: false,
    })
      .select("title status progress")
      .sort({ updatedAt: -1 })
      .limit(20),

    Task.aggregate([
      { $match: { assignedTo: uid, organization: orgId, isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const byStatus = taskStats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {});
  const totalTasks = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return {
    id:       user._id.toString(),
    name:     user.name,
    email:    user.email,
    role:     user.role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    coordinatedProjects: coordinatedProjects.map((p) => ({
      id: p._id.toString(), title: p.title, status: p.status, progress: p.progress,
    })),
    memberProjects: memberProjects.map((p) => ({
      id: p._id.toString(), title: p.title, status: p.status, progress: p.progress,
    })),
    taskStats: {
      total:      totalTasks,
      todo:       byStatus["todo"]        || 0,
      inProgress: byStatus["in-progress"] || 0,
      review:     byStatus["review"]      || 0,
      done:       byStatus["done"]        || 0,
      blocked:    byStatus["blocked"]     || 0,
      cancelled:  byStatus["cancelled"]   || 0,
    },
  };
}

// ─── updateUserRole ────────────────────────────────────────────────────────

async function updateUserRole(actor, userId, role) {
  assertAdmin(actor);

  if (!actor.organization) {
    throw new AppError(400, "User has no organization assigned");
  }

  if (!VALID_ROLES.includes(role)) {
    throw new AppError(400, `Invalid role. Valid values: ${VALID_ROLES.join(", ")}`);
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError(400, "Invalid user ID");
  if (String(userId) === String(actor.userId)) {
    throw new AppError(400, "Admins cannot change their own role");
  }

  const user = await User.findOne({
    _id: userId,
    organization: actor.organization,
    isDeleted: false,
  });
  if (!user) throw new AppError(404, "User not found");

  user.role = role;
  await user.save();

  return {
    id:        user._id.toString(),
    name:      user.name,
    email:     user.email,
    role:      user.role,
    isActive:  user.isActive !== false,
    updatedAt: user.updatedAt,
  };
}

// ─── updateUserStatus ──────────────────────────────────────────────────────

async function updateUserStatus(actor, userId, isActive) {
  assertAdmin(actor);

  if (!actor.organization) {
    throw new AppError(400, "User has no organization assigned");
  }

  if (typeof isActive !== "boolean") throw new AppError(400, "isActive must be a boolean");
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError(400, "Invalid user ID");
  if (String(userId) === String(actor.userId)) {
    throw new AppError(400, "Admins cannot deactivate their own account");
  }

  const user = await User.findOne({
    _id: userId,
    organization: actor.organization,
    isDeleted: false,
  });
  if (!user) throw new AppError(404, "User not found");

  user.isActive = isActive;
  await user.save();

  return {
    id:        user._id.toString(),
    name:      user.name,
    email:     user.email,
    role:      user.role,
    isActive:  user.isActive,
    updatedAt: user.updatedAt,
  };
}

module.exports = { getUsers, getUserById, updateUserRole, updateUserStatus };
