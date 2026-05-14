const adminUserService = require("../services/adminUserService");
const { handleError } = require("../utils/handleError");

exports.getUsers = async (req, res, next) => {
  try {
    console.log("📋 [AdminUserController] getUsers() called");
    console.log(`   User: ${req.user?.email || "unknown"}`);
    console.log(`   Role: ${req.user?.role || "unknown"}`);
    console.log(`   Organization: ${req.user?.organization || "NO ORG"}`);
    console.log(`   Query params:`, req.query);

    const { search, role, active, page, limit } = req.query;
    const result = await adminUserService.getUsers(req.user, { search, role, active, page, limit });
    
    console.log(`   ✅ getUsers succeeded. Returned ${result.users?.length || 0} users`);
    res.json(result);
  } catch (err) {
    console.error(`   ❌ getUsers error:`, err.message);
    handleError(err, res, next);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await adminUserService.getUserById(req.user, req.params.id);
    res.json({ user });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await adminUserService.updateUserRole(req.user, req.params.id, role);
    res.json({ user });
  } catch (err) {
    handleError(err, res, next);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await adminUserService.updateUserStatus(req.user, req.params.id, isActive);
    res.json({ user });
  } catch (err) {
    handleError(err, res, next);
  }
};
