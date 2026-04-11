const progressService = require("../services/progressService");
const { handleError } = require("../utils/handleError");

const createProgress = async (req, res, next) => {
  try {
    const progress = await progressService.createProgress(req.body, req.user);
    return res.status(201).json({
      message: "Progress entry created successfully",
      progress,
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

const getProgressByProject = async (req, res, next) => {
  try {
    const progress = await progressService.getProgressByProject(req.params.projectId, req.user);
    return res.json({ progress });
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = {
  createProgress,
  getProgressByProject,
};
