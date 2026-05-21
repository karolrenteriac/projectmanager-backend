const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded evidence files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes Registration
const authRoutes = require("./routers/authRouters"); // Authentication
app.use("/api/auth", authRoutes);

const userRoutes = require("./routes/userRoutes"); // Users
app.use("/api/users", userRoutes);

const projectRoutes = require("./routes/projectRoutes"); // Projects
app.use("/api/projects", projectRoutes);

const taskRoutes = require("./routes/taskRoutes"); // Tasks
app.use("/api/tasks", taskRoutes);

const myTasksRoutes = require("./routes/myTasksRoutes"); // Researcher-only Tasks Workspace
app.use("/api/my-tasks", myTasksRoutes);

const attachmentRoutes = require("./routes/attachmentRoutes"); // Versioned Deliverables
app.use("/api/tasks", attachmentRoutes);

const dashboardRoutes = require("./routes/dashboardRoutes"); // Analytics & Dashboard
app.use("/api/dashboard", dashboardRoutes);

const coordinatorDashboardRoutes = require("./routes/coordinatorDashboardRoutes"); // Coordinator Dashboard
app.use("/api/dashboard/coordinator", coordinatorDashboardRoutes);
app.use("/api/coordinator", coordinatorDashboardRoutes);

const principalDashboardRoutes = require("./routes/principalDashboardRoutes"); // Principal Dashboard
app.use("/api/dashboard/principal", principalDashboardRoutes);

const invitationRoutes = require("./routes/invitationRoutes"); // Invitations
app.use("/api/invitations", invitationRoutes);

const chatRoutes = require("./routes/chatRoutes"); // Chat system
app.use("/api/chats", chatRoutes);

const calendarRoutes = require("./routes/calendarRoutes"); // Calendar events
app.use("/api/calendar", calendarRoutes);

const notificationRoutes = require("./routes/notificationRoutes"); // Notifications
app.use("/api/notifications", notificationRoutes);

const metricsRoutes = require("./routes/metricsRoutes"); // Metrics & Logs
app.use("/api/metrics", metricsRoutes);

// Admin Reports module (analytics & exports) — registered first so its routes
// resolve directly; unmatched paths fall through to the legacy export router.
const reportRoutes = require("./routes/reportRoutes");
app.use("/api/reports", reportRoutes);

const reportsRoutes = require("./routes/reportsRoutes"); // Legacy PDF & Excel report exports
app.use("/api/reports", reportsRoutes);

const searchRoutes = require("./routes/searchRoutes"); // Search engine
app.use("/api/search", searchRoutes);

const documentRoutes = require("./routes/documentRoutes"); // Admin Documents — institutional research repository
app.use("/api/documents", documentRoutes);

const adminGovernanceRoutes = require("./routes/adminGovernanceRoutes"); // Admin Governance
app.use("/api/admin/projects", adminGovernanceRoutes);

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API working" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global Error handler
app.use((err, req, res, next) => {
  console.error("❌ GLOBAL ERROR HANDLER:", err.message || err);

  // Handle ValidationError
  if (err.name === "ValidationError") {
    return res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }

  // Handle CastError (invalid MongoDB ID)
  if (err.name === "CastError") {
    return res.status(400).json({ 
      success: false,
      message: "Invalid ID format" 
    });
  }

  // Handle MongoError (duplicate key, etc)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({ 
      success: false,
      message: `Duplicate value for field: ${field}` 
    });
  }

  // Handle AppError (custom errors with statusCode)
  if (err.statusCode) {
    return res.status(err.statusCode).json({ 
      success: false,
      message: err.message 
    });
  }

  // Default error response
  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || "Internal server error" 
  });
});

module.exports = app;