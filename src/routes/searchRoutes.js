const express = require("express");
const { 
  globalSearch, 
  searchProjects, 
  searchTasks, 
  searchDocuments, 
  searchUsers 
} = require("../controllers/searchController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/global", globalSearch);
router.get("/projects", searchProjects);
router.get("/tasks", searchTasks);
router.get("/documents", searchDocuments);
router.get("/users", searchUsers);

module.exports = router;
