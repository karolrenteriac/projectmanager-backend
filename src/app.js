const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const app = express();

// ================================
// SECURITY MIDDLEWARE
// ================================

// Helmet - adds security headers
app.use(helmet());

// ================================
// CORS CONFIGURATION
// ================================

// 🔥 CORS CORRECTO PARA RAILWAY + VERCEL
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:4200",      // Angular desarrollo
      "http://localhost:3000",      // Local fallback
      process.env.FRONTEND_URL || "https://projectmanager-frontend-kohl.vercel.app",
      "https://projectmanager-frontend-kohl.vercel.app", // Tu dominio Vercel
    ].filter(Boolean);

    console.log(`📍 CORS Request from: ${origin}`);

    // Permite requests sin origin (mobile apps, curl, etc)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS BLOQUEADO: ${origin} no está en whitelist`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 horas
};

// Aplica CORS a todas las rutas
app.use(cors(corsOptions));

// Preflight requests
app.options("*", cors(corsOptions));

// ================================
// BODY PARSERS
// ================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ================================
// STATIC FILES
// ================================
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ================================
// HEALTH CHECK
// ================================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ================================
// ROUTES
// ================================

// Authentication
const authRoutes = require("./routers/authRouters");
app.use("/api/auth", authRoutes);

// Users
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Projects
const projectRoutes = require("./routes/projectRoutes");
app.use("/api/projects", projectRoutes);

// Tasks
const taskRoutes = require("./routes/taskRoutes");
app.use("/api/tasks", taskRoutes);

// Researcher Tasks Workspace
const myTasksRoutes = require("./routes/myTasksRoutes");
app.use("/api/my-tasks", myTasksRoutes);

// Attachments
const attachmentRoutes = require("./routes/attachmentRoutes");
app.use("/api/tasks", attachmentRoutes);

// Dashboard
const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);

// Coordinator Dashboard
const coordinatorDashboardRoutes = require("./routes/coordinatorDashboardRoutes");
app.use("/api/dashboard/coordinator", coordinatorDashboardRoutes);
app.use("/api/coordinator", coordinatorDashboardRoutes);

// Principal Dashboard
const principalDashboardRoutes = require("./routes/principalDashboardRoutes");
app.use("/api/dashboard/principal", principalDashboardRoutes);

// Co-Researcher Dashboard
const coResearcherDashboardRoutes = require("./routes/coResearcherDashboardRoutes");
app.use("/api/dashboard/co-researcher", coResearcherDashboardRoutes);
app.use("/api/co-researcher", coResearcherDashboardRoutes);

// Invitations
const invitationRoutes = require("./routes/invitationRoutes");
app.use("/api/invitations", invitationRoutes);

// Chat
const chatRoutes = require("./routes/chatRoutes");
app.use("/api/chats", chatRoutes);

// Calendar
const calendarRoutes = require("./routes/calendarRoutes");
app.use("/api/calendar", calendarRoutes);

// Notifications
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

// Metrics
const metricsRoutes = require("./routes/metricsRoutes");
app.use("/api/metrics", metricsRoutes);

// Reports
const reportRoutes = require("./routes/reportRoutes");
app.use("/api/reports", reportRoutes);

const reportsRoutes = require("./routes/reportsRoutes");
app.use("/api/reports", reportsRoutes);

// Settings
const settingsRoutes = require("./routes/settingsRoutes");
app.use("/api/settings", settingsRoutes);

// Search
const searchRoutes = require("./routes/searchRoutes");
app.use("/api/search", searchRoutes);

// Documents
const documentRoutes = require("./routes/documentRoutes");
app.use("/api/documents", documentRoutes);

// Governance
const adminGovernanceRoutes = require("./routes/adminGovernanceRoutes");
app.use("/api/admin/projects", adminGovernanceRoutes);

// ================================
// TEST ROUTE
// ================================
app.get("/api/test", (req, res) => {
  res.json({ message: "API working" });
});

// ================================
// 404 HANDLER
// ================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ================================
// GLOBAL ERROR HANDLER
// ================================
app.use((err, req, res, next) => {
  console.error("❌ GLOBAL ERROR HANDLER:", err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(isDevelopment && { stack: err.stack }),
  });
});

module.exports = app;