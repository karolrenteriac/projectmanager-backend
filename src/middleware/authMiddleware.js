const jwt = require("jsonwebtoken");
const User = require("../models/user");

const JWT_SECRET = process.env.JWT_SECRET;

const protect = async (req, res, next) => {
  try {
    // 1. Validar header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    // 2. Extraer token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Empty token",
      });
    }

    // 3. Validar configuración
    if (!JWT_SECRET) {
      console.error("❌ JWT_SECRET is not defined");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    // 4. Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);

    console.log("🔐 DECODED TOKEN:", decoded);

    // 5. Soportar diferentes estructuras de token
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token payload (no userId)",
      });
    }

    // 6. Buscar usuario
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    // 7. Validar usuario activo
    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User account has been deleted",
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User account is deactivated",
      });
    }

    // 8. Normalizar usuario en req
    req.user = {
      id: user._id.toString(),
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization
        ? user.organization.toString()
        : null,
    };

    // 🔍 DEBUG IMPORTANTE
    console.log("👤 AUTH USER:", req.user);

    // 9. Validación opcional (recomendado para tu sistema)
    if (!req.user.organization) {
      console.warn(`⚠️ User ${req.user.id} has no organization`);
    }

    next();
  } catch (err) {
    console.error("❌ Auth Middleware Error:", err.message);

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token",
      });
    }

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token expired",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal auth error",
    });
  }
};

module.exports = { protect };