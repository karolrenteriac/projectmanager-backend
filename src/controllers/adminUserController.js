const adminUserService = require("../services/adminUserService");
const { AppError } = require("../errors/AppError");

exports.getUsers = async (req, res, next) => {
  try {
    console.log("📋 [AdminUserController] getUsers() called");
    console.log(`   User: ${req.user?.email || "unknown"}`);
    console.log(`   Role: ${req.user?.role || "unknown"}`);
    console.log(`   Organization: ${req.user?.organization || "NO ORG"}`);
    console.log(`   Query params:`, req.query);

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { search, role, active, page, limit } = req.query;
    const result = await adminUserService.getUsers(req.user, { search, role, active, page, limit });
    
    console.log(`   ✅ getUsers succeeded. Returned ${result.users?.length || 0} users`);
    res.json(result);
  } catch (err) {
    console.error(`   ❌ getUsers error:`, err.message, err.stack);
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Failed to load users" });
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await adminUserService.getUserById(req.user, req.params.id);
    res.json({ user });
  } catch (err) {
    console.error("❌ getUserById error:", err.message, err.stack);
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Failed to load user" });
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { role } = req.body;
    const user = await adminUserService.updateUserRole(req.user, req.params.id, role);
    res.json({ user });
  } catch (err) {
    console.error("❌ updateUserRole error:", err.message, err.stack);
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Failed to update role" });
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { isActive } = req.body;
    const user = await adminUserService.updateUserStatus(req.user, req.params.id, isActive);
    res.json({ user });
  } catch (err) {
    console.error("❌ updateUserStatus error:", err.message, err.stack);
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
};
