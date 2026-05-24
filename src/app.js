const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ================================
// CORS CONFIGURATION
// ================================
app.use(cors({
  origin: "*"
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

// ================================
// TEST ROUTE
// ================================
app.get("/api/test", (req, res) => {
  res.json({ message: "API working" });
});

// ================================
// GLOBAL ERROR HANDLER
// ================================
app.use((err, req, res, next) => {
  console.error("❌ GLOBAL ERROR HANDLER:", err.message || err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

module.exports = app;