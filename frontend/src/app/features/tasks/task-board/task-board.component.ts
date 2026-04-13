import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskService } from '@core/services/task.service';
import { ProjectService } from '@core/services/project.service';
import { Task, Project } from '@core/models';

@Component({
  selector: 'app-task-board',
  template: `
    <app-layout>
      <div class="space-y-6 h-full flex flex-col">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-foreground">Tablero de Tareas</h1>
            <p class="text-muted-foreground">Arrastra las tareas para cambiar su estado</p>
          </div>
          <div class="flex items-center gap-3">
            <select 
              [(ngModel)]="selectedProjectId"
              (change)="onProjectChange()"
              class="input w-48"
            >
              <option value="">Todos los proyectos</option>
              <option *ngFor="let project of projects" [value]="project._id">
                {{ project.name }}
              </option>
            </select>
            <button 
              routerLink="/tasks/new"
              class="btn btn-primary flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Nueva Tarea
            </button>
          </div>
        </div>

        <!-- Loading -->
        <app-loading *ngIf="isLoading" message="Cargando tareas..."></app-loading>

        <!-- Kanban Board -->
        <div 
          *ngIf="!isLoading"
          class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0 overflow-hidden"
          cdkDropListGroup
        >
          <app-task-column
            title="Pendientes"
            status="pending"
            [tasks]="pendingTasks"
            [connectedTo]="['in-progress-list', 'completed-list']"
            listId="pending-list"
            (taskDropped)="onTaskDropped($event)"
            (taskDeleted)="loadTasks()"
          ></app-task-column>

          <app-task-column
            title="En Progreso"
            status="in-progress"
            [tasks]="inProgressTasks"
            [connectedTo]="['pending-list', 'completed-list']"
            listId="in-progress-list"
            (taskDropped)="onTaskDropped($event)"
            (taskDeleted)="loadTasks()"
          ></app-task-column>

          <app-task-column
            title="Completadas"
            status="completed"
            [tasks]="completedTasks"
            [connectedTo]="['pending-list', 'in-progress-list']"
            listId="completed-list"
            (taskDropped)="onTaskDropped($event)"
            (taskDeleted)="loadTasks()"
          ></app-task-column>
        </div>
      </div>
    </app-layout>
  `
})
export class TaskBoardComponent implements OnInit {
  tasks: Task[] = [];
  projects: Project[] = [];
  selectedProjectId = '';
  isLoading = true;

  constructor(
    private taskService: TaskService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadTasks();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.projects;
      }
    });
  }

  loadTasks(): void {
    this.isLoading = true;
    const params = this.selectedProjectId ? { projectId: this.selectedProjectId } : undefined;
    
    this.taskService.getTasks(params).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onProjectChange(): void {
    this.loadTasks();
  }

  get pendingTasks(): Task[] {
    return this.tasks.filter(t => t.status === 'pending');
  }

  get inProgressTasks(): Task[] {
    return this.tasks.filter(t => t.status === 'in-progress');
  }

  get completedTasks(): Task[] {
    return this.tasks.filter(t => t.status === 'completed');
  }

  onTaskDropped(event: { task: Task; newStatus: string }): void {
    const { task, newStatus } = event;
    if (task.status === newStatus) return;

    // Optimistic update
    const originalStatus = task.status;
    task.status = newStatus as Task['status'];

    this.taskService.updateTaskStatus(task._id, newStatus).subscribe({
      error: () => {
        // Revert on error
        task.status = originalStatus;
      }
    });
  }
}
