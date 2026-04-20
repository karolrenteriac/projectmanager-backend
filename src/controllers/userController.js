const User = require("../models/user");
const { handleError } = require("../utils/handleError");

/**
 * ✅ GET USERS (Filtered by organization)
 * Used to populate team member selectors in the frontend
 */
exports.getUsers = async (req, res, next) => {
  try {
    // Safety check for user and organization
    if (!req.user || !req.user.organization) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized: Organization context is missing" 
      });
    }

    const users = await User.find({
      organization: req.user.organization,
      isDeleted: false,
    })
    .select("_id name email role")
    .sort({ name: 1 });

    console.log(`Retrieved ${users.length} users for organization ${req.user.organization}`);

    res.json(users);
  } catch (error) {
    console.error("Error in getUsers:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error loading organization users" 
    });
  }
};