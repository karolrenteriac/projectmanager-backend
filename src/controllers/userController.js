const User = require("../models/user");

exports.getUsers = async (req, res) => {
  try {
    if (!req.user || !req.user.organization) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const users = await User.find({
      organization: req.user.organization,
      isDeleted: false
    })
      .select("_id name email role")
      .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    console.error("Error loading users:", error);
    res.status(500).json({
      message: "Error loading users"
    });
  }
};