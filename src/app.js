const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes Registration
const authRoutes = require("./routers/authRouters"); // Authentication
app.use("/api/auth", authRoutes);

const userRoutes = require("./routes/userRoutes"); // Users
app.use("/api/users", userRoutes);

const projectRoutes = require("./routes/projectRoutes"); // Projects
app.use("/api/projects", projectRoutes);

const taskRoutes = require("./routes/taskRoutes"); // Tasks
app.use("/api/tasks", taskRoutes);

const dashboardRoutes = require("./routes/dashboardRoutes"); // Analytics & Dashboard
app.use("/api/dashboard", dashboardRoutes);

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

const reportsRoutes = require("./routes/reportsRoutes"); // PDF & Excel Reports
app.use("/api/reports", reportsRoutes);

const searchRoutes = require("./routes/searchRoutes"); // Search engine
app.use("/api/search", searchRoutes);

const documentsRoutes = require("./routes/documentsRoutes"); // File Management
app.use("/api/documents", documentsRoutes);

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
  console.error("GLOBAL ERROR HANDLER:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  res.status(err.status || 500).json({ 
    message: err.message || "Internal server error" 
  });
});

module.exports = app;