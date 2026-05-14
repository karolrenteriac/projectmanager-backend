const taskService = require("../services/taskService");
const { handleError } = require("../utils/handleError");

exports.createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.body, req.user);
    res.status(201).json({ task });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.getTasksByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const tasks = await taskService.getTasksByProject(projectId, req.user, req.query);
    res.json({ tasks });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user);
    res.json({ task });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user);
    res.json({ task });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await taskService.updateTask(req.params.id, { status }, req.user);
    res.json({ task });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.submitForReview = async (req, res, next) => {
  try {
    const task = await taskService.submitForReview(req.params.id, req.body, req.user);
    res.json({ task });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.reviewTask = async (req, res, next) => {
  try {
    const task = await taskService.reviewTask(req.params.id, req.body, req.user);
    res.json({ task });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const task = await taskService.addComment(req.params.id, content, req.user);
    res.json({ task });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const result = await taskService.softDeleteTask(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.uploadEvidence = async (req, res, next) => {
  try {
    const task = await taskService.uploadEvidence(req.params.id, req.files || [], req.user);
    res.status(200).json({ task, uploaded: req.files?.length || 0 });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.deleteEvidence = async (req, res, next) => {
  try {
    const task = await taskService.deleteEvidence(req.params.id, req.params.evidenceId, req.user);
    res.json({ task });
  } catch (err) {
    handleError(err, res, next);
  }
};