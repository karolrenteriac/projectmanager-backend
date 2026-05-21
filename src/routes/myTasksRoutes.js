const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { strictRoleMiddleware } = require("../middleware/roleMiddleware");
const {
  getMyTasks,
  getMyTasksCalendar,
  getMyTasksOverview,
  getMyWorkspaceProjects,
  getMyProjectTasks,
} = require("../controllers/myTasksController");

const router = express.Router();

// All researcher task routes require authentication and researcher-aligned role checks
router.use(protect);
router.use(strictRoleMiddleware(["principal", "co-researcher"]));

router.get("/",                                       getMyTasks);
router.get("/calendar",                               getMyTasksCalendar);
router.get("/overview",                               getMyTasksOverview);
router.get("/workspace/projects",                     getMyWorkspaceProjects);
router.get("/workspace/projects/:projectId/tasks",    getMyProjectTasks);

module.exports = router;
