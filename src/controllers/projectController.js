const projectService = require("../services/projectService");
const { handleError } = require("../utils/handleError");

/**
 * ✅ CREATE PROJECT
 */
exports.createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body, req.user);
    return res.status(201).json(project);
  } catch (error) {
    handleError(error, res, next);
  }
};

/**
 * ✅ GET ALL PROJECTS (User's organization)
 */
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getProjects(req.user);
    res.json({ projects });
  } catch (error) {
    handleError(error, res, next);
  }
};

/**
 * ✅ GET PROJECT BY ID
 */
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id, req.user);
    res.json({ project });
  } catch (error) {
    handleError(error, res, next);
  }
};

/**
 * ✅ UPDATE PROJECT
 */
exports.updateProject = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body, req.user);
    res.json({ message: "Project updated successfully", project });
  } catch (error) {
    handleError(error, res, next);
  }
};

/**
 * ✅ SOFT DELETE PROJECT
 */
exports.softDeleteProject = async (req, res, next) => {
  try {
    const result = await projectService.softDeleteProject(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    handleError(error, res, next);
  }
};