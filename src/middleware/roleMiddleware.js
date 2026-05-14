/**
 * Role middleware that auto-bypasses for admin.
 * Use when admin should always be allowed regardless of the listed roles.
 * @param {string[]} allowedRoles
 */
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (req.user.role === "admin") {
      return next();
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
}

/**
 * Strict role middleware — does NOT auto-bypass admin.
 * Use when admin must be explicitly listed, or when admin is intentionally excluded.
 * @param {string[]} allowedRoles
 */
function strictRoleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
    }
    next();
  };
}

module.exports = roleMiddleware;
module.exports.strictRoleMiddleware = strictRoleMiddleware;
