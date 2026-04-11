const Project = require("../models/project");
const Task = require("../models/task");
const Document = require("../models/document");
const Event = require("../models/event");
const ActivityLog = require("../models/activityLog");
const User = require("../models/user");

async function createIndexes() {
  try {
    // Project indexes
    await Project.collection.createIndexes([
      { key: { title: "text", description: "text" } },
      { key: { createdBy: 1 } },
      { key: { members: 1 } },
      { key: { status: 1 } },
      { key: { createdAt: -1 } }
    ]);

    // Task indexes
    await Task.collection.createIndexes([
      { key: { title: "text", description: "text" } },
      { key: { assignedTo: 1 } },
      { key: { project: 1 } },
      { key: { status: 1 } },
      { key: { priority: 1 } },
      { key: { createdAt: -1 } }
    ]);

    // Document indexes
    await Document.collection.createIndexes([
      { key: { name: "text" } },
      { key: { project: 1 } },
      { key: { createdBy: 1 } },
      { key: { currentVersion: 1 } },
      { key: { createdAt: -1 } }
    ]);

    // Event indexes
    await Event.collection.createIndexes([
      { key: { title: "text", description: "text", location: "text" } },
      { key: { project: 1 } },
      { key: { task: 1 } },
      { key: { createdBy: 1 } },
      { key: { participants: 1 } },
      { key: { startDate: 1 } },
      { key: { endDate: 1 } },
      { key: { type: 1 } },
      { key: { status: 1 } }
    ]);

    // ActivityLog indexes
    await ActivityLog.collection.createIndexes([
      { key: { user: 1 } },
      { key: { action: 1 } },
      { key: { entity: 1 } },
      { key: { entityId: 1 } },
      { key: { createdAt: -1 } }
    ]);

    // User indexes
    await User.collection.createIndexes([
      { key: { name: "text", email: "text" } },
      { key: { role: 1 } },
      { key: { createdAt: -1 } }
    ]);

    console.log("✅ Database indexes created successfully");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
  }
}

module.exports = { createIndexes };
