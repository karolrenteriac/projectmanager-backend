/**
 * Script to check user organization status
 * Usage: node check_users.js
 */

const mongoose = require("mongoose");
const User = require("./src/models/user");
require("dotenv").config();

async function checkUsers() {
  try {
    console.log("🔍 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all users
    const users = await User.find().select("_id name email role organization isActive isDeleted");
    
    console.log(`\n📊 Found ${users.length} users:\n`);
    console.log("─".repeat(100));

    users.forEach((user, idx) => {
      const orgStatus = user.organization ? "✅ YES" : "❌ NULL";
      const status = user.isActive ? "🟢 ACTIVE" : "🔴 INACTIVE";
      const deleted = user.isDeleted ? "🗑️ DELETED" : "✓ NORMAL";
      
      console.log(`${idx + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role} | Organization: ${orgStatus} (${user.organization || "null"}) | ${status} | ${deleted}`);
    });

    console.log("\n" + "─".repeat(100));

    // Stats
    const withOrg = users.filter(u => u.organization).length;
    const withoutOrg = users.filter(u => !u.organization).length;
    const admins = users.filter(u => u.role === "admin").length;

    console.log(`\n📈 Statistics:`);
    console.log(`   Total Users: ${users.length}`);
    console.log(`   With Organization: ${withOrg} ✅`);
    console.log(`   Without Organization: ${withoutOrg} ❌`);
    console.log(`   Admin Users: ${admins}`);

    if (withoutOrg > 0) {
      console.log(`\n⚠️  Found ${withoutOrg} user(s) without organization!`);
      console.log(`   This is likely causing the "Failed to load users" error.`);
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

checkUsers();
