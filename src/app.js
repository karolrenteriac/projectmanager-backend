const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ================================
// CORS CONFIGURATION
// ================================
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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
module.exports = app;