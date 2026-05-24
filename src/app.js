const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ================================
// CORS CONFIGURATION
// ================================
const allowedOrigins = [
  "http://localhost:4200",
  "https://projectmanager-frontend-kohl.vercel.app",
  "https://projectmanager-fron-git-d68c35-karolrenteria2005-4944s-projects.vercel.app",
  "https://projectmanager-frontend-qdbeogelt.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {

    // Permitir requests sin origin (Postman/mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
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
module.exports = app;