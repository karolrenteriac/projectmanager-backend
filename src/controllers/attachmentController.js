const attachmentService = require("../services/attachmentService");
const { handleError } = require("../utils/handleError");

/**
 * POST /api/tasks/:taskId/attachments
 * Upload initial deliverable.
 * Researcher uploads their work for review.
 */
exports.uploadInitialDeliverable = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { title, description } = req.body;
    const file = req.files?.[0];

    if (!file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const result = await attachmentService.uploadInitialDeliverable(
      taskId,
      file,
      title,
      description,
      req.user
    );

    res.status(201).json({
      message: "Deliverable uploaded successfully",
      attachment: result.attachment,
      taskStatus: result.taskStatus,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

/**
 * POST /api/tasks/:taskId/attachments/:attachmentId/version
 * Upload new version of deliverable.
 * Researcher resubmits after coordinator feedback.
 */
exports.uploadNewVersion = async (req, res, next) => {
  try {
    const { taskId, attachmentId } = req.params;
    const { changeReason } = req.body;
    const file = req.files?.[0];

    if (!file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const result = await attachmentService.uploadNewVersion(
      taskId,
      attachmentId,
      file,
      changeReason,
      req.user
    );

    res.status(201).json({
      message: "New version uploaded successfully",
      attachment: result.attachment,
      taskStatus: result.taskStatus,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

/**
 * GET /api/tasks/:taskId/attachments/:attachmentId/versions
 * Get complete version history for a deliverable.
 */
exports.getVersionHistory = async (req, res, next) => {
  try {
    const { taskId, attachmentId } = req.params;

    // Temporary debug logging to diagnose coordinator access issues
    console.log('[getVersionHistory] params:', { taskId, attachmentId });
    console.log('[getVersionHistory] user:', req.user);

    const data = await attachmentService.getVersionHistory(
      taskId,
      attachmentId,
      req.user
    );

    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
};

/**
 * PATCH /api/tasks/:taskId/attachments/:attachmentId/review
 * Coordinator reviews (approves or rejects) deliverable.
 */
exports.reviewDeliverable = async (req, res, next) => {
  try {
    const { taskId, attachmentId } = req.params;
    const { approved, feedback } = req.body;

    if (typeof approved !== "boolean") {
      return res.status(400).json({ message: "approved field must be a boolean" });
    }

    const result = await attachmentService.reviewDeliverable(
      taskId,
      attachmentId,
      approved,
      feedback,
      req.user
    );

    res.json({
      message: approved ? "Deliverable approved" : "Deliverable rejected",
      attachment: result.attachment,
      version: result.version,
      taskStatus: result.taskStatus,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

/**
 * PATCH /api/tasks/:taskId/attachments/:attachmentId/submit
 * Submit deliverable draft manually for coordinator review.
 */
exports.submitDeliverable = async (req, res, next) => {
  try {
    const { taskId, attachmentId } = req.params;

    const result = await attachmentService.submitDeliverable(
      taskId,
      attachmentId,
      req.user
    );

    res.json({
      message: "Deliverable manually submitted for coordinator review",
      attachment: result.attachment,
      taskStatus: result.taskStatus,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

/**
 * DELETE /api/tasks/:taskId/attachments/:attachmentId
 * Delete a deliverable and all its versions.
 */
exports.deleteDeliverable = async (req, res, next) => {
  try {
    const { taskId, attachmentId } = req.params;

    const result = await attachmentService.deleteDeliverable(
      taskId,
      attachmentId,
      req.user
    );

    res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};
