const User = require("../models/user");
const { toUserDTO } = require("../dtos/userDto");
const { AppError } = require("../errors/AppError");

exports.getUsers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user in request"
      });
    }

    if (!req.user.organization) {
      console.warn(`⚠️ User ${req.user.id} has no organization assigned`);
      return res.status(400).json({
        success: false,
        message: "User has no organization assigned"
      });
    }

    const users = await User.find({
      organization: req.user.organization,
      isDeleted: false
    })
      .select("_id name email role organization")
      .sort({ name: 1 });

    if (!users || users.length === 0) {
      console.log(`ℹ️ No users found for organization ${req.user.organization}`);
      return res.json([]);
    }

    // Transform using DTO for consistency
    const usersDTO = users.map(user => toUserDTO(user));

    res.json(usersDTO);
  } catch (error) {
    console.error("❌ Error loading users:", error);
    res.status(500).json({
      success: false,
      message: "Error loading users",
      error: error.message
    });
  }
};