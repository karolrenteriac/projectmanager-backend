const { AppError } = require("../errors/AppError");

const handleError = (err, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  next(err);
};

module.exports = { handleError };
