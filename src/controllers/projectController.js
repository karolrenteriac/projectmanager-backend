const projectService = require("../services/projectService");
const { handleError } = require("../utils/handleError");

const createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body, req.user);
    return res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getProjects(req.user);
    return res.json({ projects });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id, req.user);
    return res.json({ project });
  } catch (err) {
    handleError(err, res, next);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body, req.user);
    return res.json({
      message: "Project updated successfully",
      project,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const softDeleteProject = async (req, res, next) => {
  try {
    const result = await projectService.softDeleteProject(req.params.id, req.user);
    return res.json({ message: result.message });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  softDeleteProject,
};
