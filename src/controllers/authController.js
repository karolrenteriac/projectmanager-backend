const userService = require("../services/userService");
const { handleError } = require("../utils/handleError");

const register = async (req, res, next) => {
  try {
    const result = await userService.register(req.body);
    return res.status(201).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body);
    return res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

module.exports = { register, login };
