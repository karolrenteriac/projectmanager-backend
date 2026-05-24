const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ================================
// CORS CONFIGURATION
// ================================
const allowedOrigins = [
  "http://localhost:4200",
  "https://projectmanager-frontend-kohl.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {

    // permitir postman/mobile
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
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