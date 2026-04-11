const Project = require("../models/project");
const Task = require("../models/task");
const Document = require("../models/document");
const User = require("../models/user");
const Event = require("../models/event");
const { AppError } = require("../errors/AppError");
const { getPaginationParams, createPaginatedResponse } = require("../utils/pagination");

async function globalSearch(query, page = 1, limit = 20, filters = {}) {
  if (!query) {
    throw new AppError(400, "Search query is required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });
  const searchRegex = { $regex: query, $options: "i" };

  const [projects, tasks, documents, events] = await Promise.all([
    Project.find({
      $and: [
        { $or: [
          { title: searchRegex },
          { description: searchRegex }
        ] },
        filters.status ? { status: filters.status } : {}
      ]
    })
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.floor(validatedLimit / 4)),
    
    Task.find({
      $and: [
        { $or: [
          { title: searchRegex },
          { description: searchRegex }
        ] },
        filters.status ? { status: filters.status } : {},
        filters.assignedTo ? { assignedTo: filters.assignedTo } : {}
      ]
    })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.floor(validatedLimit / 4)),
    
    Document.find({
      $and: [
        { $or: [
          { name: searchRegex }
        ] },
        filters.projectId ? { project: filters.projectId } : {}
      ]
    })
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.floor(validatedLimit / 4)),
    
    Event.find({
      $and: [
        { $or: [
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex }
        ] },
        filters.projectId ? { project: filters.projectId } : {},
        filters.type ? { type: filters.type } : {}
      ]
    })
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .populate('participants', 'name email')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(Math.floor(validatedLimit / 4))
  ]);

  const allResults = [
    ...projects.map(p => ({ ...p.toObject(), type: 'project' })),
    ...tasks.map(t => ({ ...t.toObject(), type: 'task' })),
    ...documents.map(d => ({ ...d.toObject(), type: 'document' })),
    ...events.map(e => ({ ...e.toObject(), type: 'event' }))
  ];

  const total = projects.length + tasks.length + documents.length + events.length;

  return createPaginatedResponse(allResults, total, page, validatedLimit);
}

async function searchProjects(query, page = 1, limit = 20, filters = {}) {
  if (!query) {
    throw new AppError(400, "Search query is required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });
  const searchRegex = { $regex: query, $options: "i" };

  let searchQuery = {
    $or: [
      { title: searchRegex },
      { description: searchRegex }
    ]
  };

  if (filters.status) {
    searchQuery.status = filters.status;
  }

  if (filters.createdBy) {
    searchQuery.createdBy = filters.createdBy;
  }

  const projects = await Project.find(searchQuery)
    .populate('createdBy', 'name email')
    .populate('members', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await Project.countDocuments(searchQuery);

  return createPaginatedResponse(projects, total, page, validatedLimit);
}

async function searchTasks(query, page = 1, limit = 20, filters = {}) {
  if (!query) {
    throw new AppError(400, "Search query is required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });
  const searchRegex = { $regex: query, $options: "i" };

  let searchQuery = {
    $or: [
      { title: searchRegex },
      { description: searchRegex }
    ]
  };

  if (filters.status) {
    searchQuery.status = filters.status;
  }

  if (filters.assignedTo) {
    searchQuery.assignedTo = filters.assignedTo;
  }

  if (filters.projectId) {
    searchQuery.project = filters.projectId;
  }

  const tasks = await Task.find(searchQuery)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('project', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await Task.countDocuments(searchQuery);

  return createPaginatedResponse(tasks, total, page, validatedLimit);
}

async function searchDocuments(query, page = 1, limit = 20, filters = {}) {
  if (!query) {
    throw new AppError(400, "Search query is required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });
  const searchRegex = { $regex: query, $options: "i" };

  let searchQuery = {
    name: searchRegex
  };

  if (filters.projectId) {
    searchQuery.project = filters.projectId;
  }

  if (filters.createdBy) {
    searchQuery.createdBy = filters.createdBy;
  }

  const documents = await Document.find(searchQuery)
    .populate('createdBy', 'name email')
    .populate('project', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await Document.countDocuments(searchQuery);

  return createPaginatedResponse(documents, total, page, validatedLimit);
}

async function searchUsers(query, page = 1, limit = 20, filters = {}) {
  if (!query) {
    throw new AppError(400, "Search query is required.");
  }

  const { limit: validatedLimit, skip } = getPaginationParams({ page, limit });
  const searchRegex = { $regex: query, $options: "i" };

  let searchQuery = {
    $or: [
      { name: searchRegex },
      { email: searchRegex }
    ]
  };

  if (filters.role) {
    searchQuery.role = filters.role;
  }

  const users = await User.find(searchQuery)
    .select('name email role createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(validatedLimit);

  const total = await User.countDocuments(searchQuery);

  return createPaginatedResponse(users, total, page, validatedLimit);
}

module.exports = {
  globalSearch,
  searchProjects,
  searchTasks,
  searchDocuments,
  searchUsers,
};
