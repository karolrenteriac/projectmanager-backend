// ⚡ FORCE IPv4 DNS - DEBE SER PRIMERA LÍNEA
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

require("dotenv").config();
const http = require("http");
const socketIo = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const registerSocketHandlers = require("./sockets/socket");
const { createIndexes } = require("./config/indexes");
const { setIo } = require("./config/io");
const { startOverdueNotificationJob } = require("./jobs/overdueNotificationJob");
const { getEmailService } = require("./services/email.service");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB connected");

    // Create database indexes for optimization
    await createIndexes();

    // 🔥 Initialize Email Service and verify SMTP
    console.log("🔄 Initializing Email Service...");
    const emailService = getEmailService();
    const smtpVerification = await emailService.verifyConnection();

    if (smtpVerification.success) {
      console.log("✅ Email Service ready (SMTP verified)");
    } else {
      console.warn(
        "⚠️  SMTP verification failed:",
        smtpVerification.message
      );
      // In production, you might want to exit here
      if (process.env.NODE_ENV === "production") {
        console.error("❌ Email Service failed in production. Exiting.");
        process.exit(1);
      }
    }

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.io
    const io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Expose the io instance app-wide so services can emit realtime events.
    setIo(io);
    app.set("io", io);

    // Register Socket handlers
    registerSocketHandlers(io);

    // Start server
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║       ProjectManager Backend Start     ║
║   Port: ${PORT.toString().padEnd(28, " ")}║
║   Environment: ${(process.env.NODE_ENV || "development").padEnd(20, " ")}║
║   SMTP: ${(smtpVerification.success ? "✅ Ready" : "⚠️  Failed").padEnd(27, " ")}║
╚════════════════════════════════════════╝
      `);
    });

    // Background job: scans for overdue tasks and notifies assignees.
    startOverdueNotificationJob();

    // ============ GRACEFUL SHUTDOWN ============

    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);

      server.close(async () => {
        console.log("✓ HTTP server closed");
        try {
          console.log("✓ Cleanup completed");
          process.exit(0);
        } catch (error) {
          console.error("Error during shutdown:", error);
          process.exit(1);
        }
      });

      // Force exit if not closed in 10 seconds
      setTimeout(() => {
        console.error(
          "❌ Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

// Start the server
startServer();