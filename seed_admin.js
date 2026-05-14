/**
 * Seed script to create a test admin user
 * Usage: node seed_admin.js
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/user");
require("dotenv").config();

async function seedAdmin() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected");

    // Check if admin already exists
    const existing = await User.findOne({ email: "test@admin.com" });
    if (existing) {
      console.log("⚠️  Test admin already exists");
      console.log(`   Email: test@admin.com`);
      console.log(`   Password: password123`);
      console.log(`   Role: admin`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create new admin
    const adminId = new mongoose.Types.ObjectId();
    const hashedPassword = await bcrypt.hash("password123", 10);

    const admin = await User.create({
      _id: adminId,
      name: "Test Admin",
      email: "test@admin.com",
      password: hashedPassword,
      role: "admin",
      organization: adminId,
      isActive: true,
      isDeleted: false,
    });

    console.log("✅ Test admin created successfully!");
    console.log(`   ID: ${admin._id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: test@admin.com`);
    console.log(`   Password: password123`);
    console.log(`   Role: admin`);
    console.log(`   Organization: ${admin.organization}`);

    console.log("\n✨ You can now login with these credentials");

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seedAdmin();
