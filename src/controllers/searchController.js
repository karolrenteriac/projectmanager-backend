const searchService = require("../services/searchService");
const { handleError } = require("../utils/handleError");

const globalSearch = async (req, res, next) => {
  try {
    const { q: query, page = 1, limit = 20, status, project, assignedTo } = req.query;

    const result = await searchService.globalSearch(
      query,
      parseInt(page),
      parseInt(limit),
      {
        status,
        project,
        assignedTo
      }
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const searchProjects = async (req, res, next) => {
  try {
    const { q: query, page = 1, limit = 20, status, createdBy } = req.query;

    const result = await searchService.searchProjects(
      query,
      parseInt(page),
      parseInt(limit),
      {
        status,
        createdBy
      }
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const searchTasks = async (req, res, next) => {
  try {
    const { q: query, page = 1, limit = 20, status, assignedTo, project } = req.query;

    const result = await searchService.searchTasks(
      query,
      parseInt(page),
      parseInt(limit),
      {
        status,
        assignedTo,
        project
      }
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const searchDocuments = async (req, res, next) => {
  try {
    const { q: query, page = 1, limit = 20, project, createdBy } = req.query;

    const result = await searchService.searchDocuments(
      query,
      parseInt(page),
      parseInt(limit),
      {
        project,
        createdBy
      }
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const { q: query, page = 1, limit = 20, role } = req.query;

    const result = await searchService.searchUsers(
      query,
      parseInt(page),
      parseInt(limit),
      {
        role
      }
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  globalSearch,
  searchProjects,
  searchTasks,
  searchDocuments,
  searchUsers,
};
