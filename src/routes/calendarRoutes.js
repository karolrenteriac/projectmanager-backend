const express = require("express");
const { 
  createEvent, 
  getEvents, 
  getEventById, 
  updateEvent, 
  deleteEvent, 
  getProjectEvents 
} = require("../controllers/calendarController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createEvent);

router.get("/", getEvents);

router.get("/:id", getEventById);

router.put("/:id", updateEvent);

router.delete("/:id", deleteEvent);

router.get("/project/:projectId", getProjectEvents);

module.exports = router;
