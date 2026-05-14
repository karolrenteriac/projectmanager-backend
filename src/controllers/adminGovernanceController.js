const adminGovernanceService = require("../services/adminGovernanceService");
const { handleError } = require("../utils/handleError");

exports.getGovernanceData = async (req, res, next) => {
  try {
    const result = await adminGovernanceService.getGovernanceData(req.user);
    res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.getProjectReport = async (req, res, next) => {
  try {
    const report = await adminGovernanceService.getProjectReport(
      req.user,
      req.params.id
    );
    res.json({ report });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.assignCoordinator = async (req, res, next) => {
  try {
    const { coordinatorId } = req.body;
    const result = await adminGovernanceService.assignCoordinator(
      req.user,
      req.params.id,
      coordinatorId
    );
    res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};
