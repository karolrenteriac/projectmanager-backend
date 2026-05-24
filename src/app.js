const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ================================
// CORS CONFIGURATION
// ================================
app.use(cors({
  origin: [
    "http://localhost:4200",
    "https://projectmanager-frontend-kohl.vercel.app"
  ],
  credentials: true
}));

// ================================
// MIDDLEWARES
// ================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================
// STATIC FILES
// ================================
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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
    message: `Route ${req.originalUrl} not found`
  });
});

// ================================
// GLOBAL ERROR HANDLER
// ================================
app.use((err, req, res, next) => {
  console.error("❌ GLOBAL ERROR HANDLER:", err.message || err);

  // ValidationError
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Invalid Mongo ID
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }

  // Duplicate Key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];

    return res.status(400).json({
      success: false,
      message: `Duplicate value for field: ${field}`
    });
  }

  // Custom AppError
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Default Error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

module.exports = app;