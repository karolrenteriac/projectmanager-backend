const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/projectmanager')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Find principal user
    const principal = await db.collection('users').findOne({email: 'sarah.johnson@research.edu'});
    console.log('=== Principal User ===');
    if (principal) {
      console.log('Name:', principal.name);
      console.log('Email:', principal.email);
      console.log('Role:', principal.role);
      console.log('ID:', principal._id);
      
      // Count projects
      const projectCount = await db.collection('projects').countDocuments();
      console.log('\n=== Projects ===');
      console.log('Total projects count:', projectCount);
      
      // Get projects list
      const projects = await db.collection('projects').find().limit(10).toArray();
      console.log('Sample projects:');
      projects.forEach((p, i) => {
        console.log((i+1) + '. ' + p.name + ' (ID: ' + p._id + ')');
      });
      
      // Count tasks assigned to principal
      const taskCount = await db.collection('tasks').countDocuments({assignedTo: principal._id});
      console.log('\n=== Tasks Assigned to Principal ===');
      console.log('Total tasks count:', taskCount);
      
      // Get tasks list
      const tasks = await db.collection('tasks').find({assignedTo: principal._id}).limit(10).toArray();
      console.log('Sample tasks:');
      tasks.forEach((t, i) => {
        console.log((i+1) + '. ' + t.title + ' (Status: ' + t.status + ')');
      });
      
      console.log('\n=== Summary ===');
      console.log('✓ Principal user found: Dr. Sarah Johnson');
      console.log('✓ Total projects: ' + projectCount);
      console.log('✓ Tasks assigned to principal: ' + taskCount);
      console.log('✓ Seeded data successfully confirmed in MongoDB');
    } else {
      console.log('❌ Principal user not found');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  });
