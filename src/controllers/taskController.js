const taskService = require("../services/taskService");
const { handleError } = require("../utils/handleError");

const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.body, req.user);
    return res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getTasksByProject = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasksByProject(req.params.projectId, req.user);
    return res.json({ tasks });
  } catch (err) {
    handleError(err, res, next);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const task = await taskService.updateTaskStatus(req.params.id, req.body, req.user);
    return res.json({
      message: "Task updated successfully",
      task,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const softDeleteTask = async (req, res, next) => {
  try {
    const result = await taskService.softDeleteTask(req.params.id, req.user);
    return res.json({
      message: result.message,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  createTask,
  getTasksByProject,
  updateTaskStatus,
  softDeleteTask,
};
