const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require("./routers/authRouters");
app.use("/api/auth", authRoutes);

const projectRoutes = require("./routes/projectRoutes");
app.use("/api/projects", projectRoutes);

const taskRoutes = require("./routes/taskRoutes");
app.use("/api/tasks", taskRoutes);

const progressRoutes = require("./routes/progressRoutes");
app.use("/api/progress", progressRoutes);

const documentRoutes = require("./routes/documentRoutes");
app.use("/api/documents", documentRoutes);

const invitationRoutes = require("./routes/invitationRoutes");
app.use("/api/invitations", invitationRoutes);

const chatRoutes = require("./routes/chatRoutes");
app.use("/api/chats", chatRoutes);

const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

const documentsRoutes = require("./routes/documentsRoutes");
app.use("/api/documents", documentsRoutes);

const metricsRoutes = require("./routes/metricsRoutes");
app.use("/api/metrics", metricsRoutes);

const calendarRoutes = require("./routes/calendarRoutes");
app.use("/api/calendar", calendarRoutes);

const reportsRoutes = require("./routes/reportsRoutes");
app.use("/api/reports", reportsRoutes);

const searchRoutes = require("./routes/searchRoutes");
app.use("/api/search", searchRoutes);

// Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({ message: "API working" });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "ValidationError") {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid id or value" });
  }
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;