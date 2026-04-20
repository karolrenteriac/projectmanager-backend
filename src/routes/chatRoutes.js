const express = require("express");
const { 
  createChat, 
  getChatMessages, 
  sendMessage, 
  getUserChats, 
  joinChat 
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createChat);
router.get("/", getUserChats);
router.get("/:id/messages", getChatMessages);
router.post("/messages", sendMessage);
router.post("/join", joinChat);

module.exports = router;
