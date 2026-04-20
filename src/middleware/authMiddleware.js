const jwt = require("jsonwebtoken");
const User = require("../models/user");

const JWT_SECRET = process.env.JWT_SECRET;

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: Empty token" });
    }

    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid token payload" });
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }

    if (user.isDeleted) {
      return res.status(401).json({ success: false, message: "Unauthorized: User account is deactivated" });
    }

    const id = user._id.toString();
    
    // Standardize user object on req
    req.user = {
      id: id,
      userId: id, // compatibility for both styles
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization ? user.organization.toString() : null,
    };

    if (!req.user.organization) {
      // If organization is required for the system, handle it here or in controllers
      console.warn(`User ${id} has no organization assigned`);
    }

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
    }
    next(err);
  }
};

module.exports = { protect };
