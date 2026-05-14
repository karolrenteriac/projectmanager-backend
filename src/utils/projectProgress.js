const mongoose = require("mongoose");
const Task = require("../models/task");
const Project = require("../models/project");

/**
 * Calcula y actualiza el progreso de un proyecto basado en el estado de sus tareas
 * @param {string} projectId - ID del proyecto
 * @returns {Promise<number>} - Porcentaje de progreso (0-100)
 */
async function updateProjectProgress(projectId) {
  const pId = projectId?._id || projectId;
  if (!pId || !mongoose.Types.ObjectId.isValid(String(pId))) {
    return 0;
  }
  try {
    // Contar tareas totales y completadas
    const [totalTasks, completedTasks] = await Promise.all([
      Task.countDocuments({ project: pId, isDeleted: false }),
      Task.countDocuments({ 
        project: pId, 
        status: "done", 
        isDeleted: false 
      })
    ]);

    // Calcular progreso
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // Actualizar proyecto
    await Project.findByIdAndUpdate(pId, { progress });

    return progress;
  } catch (error) {
    console.error("Error updating project progress:", error);
    throw error;
  }
}

module.exports = {
  updateProjectProgress,
};
