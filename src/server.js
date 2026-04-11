require("dotenv").config();
const http = require("http");
const socketIo = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const { registerSocketHandlers } = require("./sockets/socket");
const { createIndexes } = require("./config/indexes");

const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
  // Create database indexes for optimization
  await createIndexes();

  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  registerSocketHandlers(io);

  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error("❌ Failed to start server:", error.message);
  process.exit(1);
});
