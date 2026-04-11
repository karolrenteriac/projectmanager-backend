const Project = require("../models/project");
const Task = require("../models/task");
const User = require("../models/user");
const Document = require("../models/document");
const { AppError } = require("../errors/AppError");
const ReportGenerator = require("../utils/reportGenerator");

async function generateProjectsReport(format = 'pdf', filters = {}) {
  let query = {};
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.startDate && filters.endDate) {
    query.createdAt = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate),
    };
  }

  const projects = await Project.find(query)
    .populate('createdBy', 'name email')
    .populate('members', 'name email')
    .sort({ createdAt: -1 });

  const fields = ['title', 'description', 'status', 'createdBy', 'members', 'createdAt'];
  
  if (format === 'excel') {
    return await ReportGenerator.generateExcel(projects, 'Projects', fields, 'Projects');
  } else {
    return await ReportGenerator.generatePDF(projects, 'Projects Report', fields);
  }
}

async function generateTasksReport(format = 'pdf', filters = {}) {
  let query = {};
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }
  
  if (filters.projectId) {
    query.project = filters.projectId;
  }

  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('project', 'name')
    .sort({ createdAt: -1 });

  const fields = ['title', 'description', 'status', 'priority', 'assignedTo', 'project', 'createdBy', 'createdAt'];

  if (format === 'excel') {
    return await ReportGenerator.generateExcel(tasks, 'Tasks', fields, 'Tasks');
  } else {
    return await ReportGenerator.generatePDF(tasks, 'Tasks Report', fields);
  }
}

async function generateProjectsPDF(projects) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    
    doc.fontSize(20).text('Projects Report', { align: 'center' });
    doc.moveDown();
    
    projects.forEach((project, index) => {
      doc.fontSize(14).text(`${index + 1}. ${project.title}`);
      doc.fontSize(10).text(`Description: ${project.description || 'N/A'}`);
      doc.text(`Status: ${project.status}`);
      doc.text(`Created By: ${project.createdBy.name} (${project.createdBy.email})`);
      doc.text(`Members: ${project.members.map(m => m.name).join(', ')}`);
      doc.text(`Created: ${project.createdAt.toLocaleDateString()}`);
      doc.moveDown();
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve({
        buffer: pdfBuffer,
        filename: 'projects-report.pdf',
        contentType: 'application/pdf'
      });
    });
    
    doc.end();
  });
}

async function generateProjectsExcel(projects) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Projects');

  worksheet.columns = [
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Created By', key: 'createdByName', width: 25 },
    { header: 'Created Email', key: 'createdByEmail', width: 30 },
    { header: 'Members', key: 'membersCount', width: 15 },
    { header: 'Created Date', key: 'createdAt', width: 20 }
  ];

  const projectsData = projects.map(project => ({
    title: project.title,
    description: project.description || '',
    status: project.status,
    createdByName: project.createdBy.name,
    createdByEmail: project.createdBy.email,
    membersCount: project.members.length,
    createdAt: project.createdAt.toLocaleDateString()
  }));

  worksheet.addRows(projectsData);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    filename: 'projects-report.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
}

async function generateTasksPDF(tasks) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    
    doc.fontSize(20).text('Tasks Report', { align: 'center' });
    doc.moveDown();
    
    tasks.forEach((task, index) => {
      doc.fontSize(14).text(`${index + 1}. ${task.title}`);
      doc.fontSize(10).text(`Description: ${task.description || 'N/A'}`);
      doc.text(`Status: ${task.status}`);
      doc.text(`Priority: ${task.priority || 'N/A'}`);
      doc.text(`Assigned To: ${task.assignedTo ? task.assignedTo.name : 'N/A'}`);
      doc.text(`Project: ${task.project ? task.project.name : 'N/A'}`);
      doc.text(`Created By: ${task.createdBy.name}`);
      doc.text(`Created: ${task.createdAt.toLocaleDateString()}`);
      doc.moveDown();
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve({
        buffer: pdfBuffer,
        filename: 'tasks-report.pdf',
        contentType: 'application/pdf'
      });
    });
    
    doc.end();
  });
}

async function generateTasksExcel(tasks) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Tasks');

  worksheet.columns = [
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Priority', key: 'priority', width: 15 },
    { header: 'Assigned To', key: 'assignedToName', width: 25 },
    { header: 'Assigned Email', key: 'assignedToEmail', width: 30 },
    { header: 'Project', key: 'projectName', width: 25 },
    { header: 'Created By', key: 'createdByName', width: 25 },
    { header: 'Created Date', key: 'createdAt', width: 20 }
  ];

  const tasksData = tasks.map(task => ({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority || '',
    assignedToName: task.assignedTo ? task.assignedTo.name : '',
    assignedToEmail: task.assignedTo ? task.assignedTo.email : '',
    projectName: task.project ? task.project.name : '',
    createdByName: task.createdBy.name,
    createdAt: task.createdAt.toLocaleDateString()
  }));

  worksheet.addRows(tasksData);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    filename: 'tasks-report.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
}

async function generateUserActivityReport(userId, format = 'pdf', filters = {}) {
  const [userTasks, userProjects, userDocuments] = await Promise.all([
    Task.find({ assignedTo: userId }).populate('project', 'name'),
    Project.find({ $or: [{ createdBy: userId }, { members: userId }] }).populate('createdBy', 'name email'),
    Document.find({ createdBy: userId }).populate('project', 'name')
  ]);

  const dataSheets = [
    {
      name: 'Tasks',
      data: userTasks,
      fields: ['title', 'project', 'status', 'createdAt']
    },
    {
      name: 'Projects',
      data: userProjects,
      fields: ['title', 'createdBy', 'status', 'createdAt']
    },
    {
      name: 'Documents',
      data: userDocuments,
      fields: ['name', 'project', 'currentVersion', 'createdAt']
    }
  ];

  if (format === 'excel') {
    return await ReportGenerator.generateMultiSheetExcel(dataSheets, 'User Activity');
  } else {
    return await ReportGenerator.generatePDF(userTasks, 'User Activity Report - Tasks', ['title', 'project', 'status', 'createdAt']);
  }
}

async function generateUserActivityPDF(tasks, projects, documents) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    
    doc.fontSize(20).text('User Activity Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(16).text('Tasks');
    tasks.forEach((task, index) => {
      doc.fontSize(12).text(`${index + 1}. ${task.title}`);
      doc.fontSize(10).text(`Project: ${task.project.name}`);
      doc.text(`Status: ${task.status}`);
      doc.moveDown();
    });
    
    doc.fontSize(16).text('Projects');
    projects.forEach((project, index) => {
      doc.fontSize(12).text(`${index + 1}. ${project.title}`);
      doc.fontSize(10).text(`Created By: ${project.createdBy.name}`);
      doc.text(`Status: ${project.status}`);
      doc.moveDown();
    });
    
    doc.fontSize(16).text('Documents');
    documents.forEach((doc, index) => {
      doc.fontSize(12).text(`${index + 1}. ${doc.name}`);
      doc.fontSize(10).text(`Project: ${doc.project.name}`);
      doc.text(`Version: ${doc.currentVersion}`);
      doc.moveDown();
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve({
        buffer: pdfBuffer,
        filename: 'user-activity-report.pdf',
        contentType: 'application/pdf'
      });
    });
    
    doc.end();
  });
}

async function generateUserActivityExcel(tasks, projects, documents) {
  const workbook = new ExcelJS.Workbook();
  
  const tasksSheet = workbook.addWorksheet('Tasks');
  tasksSheet.columns = [
    { header: 'Task Title', key: 'title', width: 30 },
    { header: 'Project', key: 'projectName', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Created Date', key: 'createdAt', width: 20 }
  ];
  
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Project Title', key: 'title', width: 30 },
    { header: 'Created By', key: 'createdByName', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Created Date', key: 'createdAt', width: 20 }
  ];
  
  const documentsSheet = workbook.addWorksheet('Documents');
  documentsSheet.columns = [
    { header: 'Document Name', key: 'name', width: 30 },
    { header: 'Project', key: 'projectName', width: 25 },
    { header: 'Current Version', key: 'currentVersion', width: 15 },
    { header: 'Created Date', key: 'createdAt', width: 20 }
  ];

  tasksSheet.addRows(tasks.map(task => ({
    title: task.title,
    projectName: task.project.name,
    status: task.status,
    createdAt: task.createdAt.toLocaleDateString()
  })));

  projectsSheet.addRows(projects.map(project => ({
    title: project.title,
    createdByName: project.createdBy.name,
    status: project.status,
    createdAt: project.createdAt.toLocaleDateString()
  })));

  documentsSheet.addRows(documents.map(doc => ({
    name: doc.name,
    projectName: doc.project.name,
    currentVersion: doc.currentVersion,
    createdAt: doc.createdAt.toLocaleDateString()
  })));

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    filename: 'user-activity-report.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
}

module.exports = {
  generateProjectsReport,
  generateTasksReport,
  generateUserActivityReport,
};
