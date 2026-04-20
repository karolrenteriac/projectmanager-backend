const taskService = require("../services/taskService");
const { handleError } = require("../utils/handleError");

/**
 * ✅ CREATE TASK
 */
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

/**
 * ✅ GET TASKS (By Project usually)
 */
const getTasks = async (req, res, next) => {
  try {
    // If projectId is in query or body
    const projectId = req.query.projectId || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({ message: "projectId is required as a query parameter" });
    }
    const tasks = await taskService.getTasksByProject(projectId, req.user);
    return res.json({ tasks });
  } catch (err) {
    handleError(err, res, next);
  }
};

/**
 * ✅ GET TASK BY ID
 * Note: If standard service doesn't have it, we implement basic logic or call getTasksByProject filter
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user);
    return res.json({ task });
  } catch (err) {
    handleError(err, res, next);
  }
};

/**
 * ✅ UPDATE TASK STATUS
 */
const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTaskStatus(
      req.params.id,
      req.body,
      req.user
    );
    return res.json({
      message: "Task updated successfully",
      task,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

/**
 * ✅ DELETE TASK (SOFT)
 */
const deleteTask = async (req, res, next) => {
  try {
    const result = await taskService.softDeleteTask(
      req.params.id,
      req.user
    );
    return res.json({
      message: result.message,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  // Keep original names for backward compatibility if any
  getTasksByProject: getTasks,
  updateTaskStatus: updateTask,
  softDeleteTask: deleteTask
};