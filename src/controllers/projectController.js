const projectService = require("../services/projectService");
const { handleError } = require("../utils/handleError");

/**
 * CREATE PROJECT
 */
exports.createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body, req.user);
    return res.status(201).json(project); // ✅ limpio
  } catch (error) {
    handleError(error, res, next);
  }
};

/**
 * GET PROJECTS
 */
exports.getProjects = async (req, res, next) => {
  try {
    const { search } = req.query;
    const projects = await projectService.getProjects(req.user, search);
    res.json({ projects }); // 🔥 este sí se mantiene así
  } catch (error) {
    handleError(error, res, next);
  }
};

/**
 * GET PROJECT BY ID
 */
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id, req.user);
    res.json(project); // ✅ SIN wrapper { project }
  } catch (error) {
    handleError(error, res, next);
  }
};

/**
 * UPDATE PROJECT
 */
exports.updateProject = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body, req.user);
    res.json(project); // ✅ limpio
  } catch (error) {
    handleError(error, res, next);
  }
};

/**
 * DELETE PROJECT
 */
exports.softDeleteProject = async (req, res, next) => {
  try {
    const result = await projectService.softDeleteProject(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    handleError(error, res, next);
  }
};

/**
 * EXPORT PROJECT
 */
exports.exportProject = async (req, res, next) => {
  try {
    const exportData = await projectService.exportProject(req.params.id, req.user);

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="project-${req.params.id}.json"`
    );

    res.json(exportData);
  } catch (error) {
    handleError(error, res, next);
  }
};