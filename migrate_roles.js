const mongoose = require("mongoose");
const User = require("./src/models/user");
require("dotenv").config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const result = await User.updateMany(
      { role: "analyst" },
      { role: "coordinator" }
    );

    console.log(`Migration complete. Updated ${result.modifiedCount} users from 'analyst' to 'coordinator'.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
