import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService } from '@core/services/project.service';
import { TaskService } from '@core/services/task.service';
import { Project, Task } from '@core/models';

@Component({
  selector: 'app-project-detail',
  template: `
    <app-layout>
      <div *ngIf="isLoading">
        <app-loading message="Cargando proyecto..."></app-loading>
      </div>

      <div *ngIf="!isLoading && project" class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <a routerLink="/projects" class="hover:text-foreground">Proyectos</a>
              <span>/</span>
              <span>{{ project.name }}</span>
            </div>
            <h1 class="text-2xl font-bold text-foreground">{{ project.name }}</h1>
            <p class="text-muted-foreground mt-2">{{ project.description || 'Sin descripcion' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span 
              class="badge"
              [ngClass]="getStatusClass(project.status)"
            >
              {{ getStatusLabel(project.status) }}
            </span>
            <button 
              [routerLink]="['/projects', project._id, 'edit']"
              class="btn btn-secondary"
            >
              Editar
            </button>
            <button 
              (click)="showDeleteConfirm = true"
              class="btn btn-destructive"
            >
              Eliminar
            </button>
          </div>
        </div>

        <!-- Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card">
            <p class="text-sm text-muted-foreground">Fecha de Inicio</p>
            <p class="text-lg font-semibold text-foreground">{{ formatDate(project.startDate) }}</p>
          </div>
          <div class="card">
            <p class="text-sm text-muted-foreground">Fecha de Fin</p>
            <p class="text-lg font-semibold text-foreground">{{ project.endDate ? formatDate(project.endDate) : 'Sin definir' }}</p>
          </div>
          <div class="card">
            <p class="text-sm text-muted-foreground">Presupuesto</p>
            <p class="text-lg font-semibold text-foreground">{{ project.budget ? formatCurrency(project.budget) : 'Sin definir' }}</p>
          </div>
        </div>

        <!-- Main Content -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Tasks -->
          <div class="lg:col-span-2 card">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-foreground">Tareas del Proyecto</h2>
              <button 
                routerLink="/tasks"
                [queryParams]="{ projectId: project._id }"
                class="btn btn-primary btn-sm flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nueva Tarea
              </button>
            </div>

            <div *ngIf="tasks.length === 0" class="text-center py-8">
              <p class="text-muted-foreground">No hay tareas en este proyecto</p>
            </div>

            <div *ngIf="tasks.length > 0" class="space-y-3">
              <div 
                *ngFor="let task of tasks"
                class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
              >
                <div 
                  class="h-3 w-3 rounded-full"
                  [ngClass]="getPriorityColor(task.priority)"
                ></div>
                <div class="flex-1">
                  <p class="font-medium text-foreground">{{ task.title }}</p>
                  <p class="text-sm text-muted-foreground">{{ getTaskStatus(task.status) }}</p>
                </div>
                <span 
                  class="badge"
                  [ngClass]="getTaskStatusClass(task.status)"
                >
                  {{ getTaskStatus(task.status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Members -->
          <div class="card">
            <h2 class="text-lg font-semibold text-foreground mb-4">Miembros del Equipo</h2>
            <div class="space-y-3">
              <div 
                *ngFor="let member of project.members"
                class="flex items-center gap-3"
              >
                <app-avatar 
                  [name]="getMemberName(member)"
                  size="sm"
                ></app-avatar>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-foreground truncate">{{ getMemberName(member) }}</p>
                  <p class="text-xs text-muted-foreground capitalize">{{ member.role }}</p>
                </div>
              </div>
              <div *ngIf="!project.members?.length" class="text-center py-4">
                <p class="text-sm text-muted-foreground">No hay miembros asignados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation -->
      <app-confirm-dialog
        [isOpen]="showDeleteConfirm"
        title="Eliminar Proyecto"
        message="Esta seguro de que desea eliminar este proyecto? Esta accion no se puede deshacer."
        confirmText="Eliminar"
        confirmVariant="destructive"
        (confirm)="deleteProject()"
        (cancel)="showDeleteConfirm = false"
      ></app-confirm-dialog>
    </app-layout>
  `
})
export class ProjectDetailComponent implements OnInit {
  project: Project | null = null;
  tasks: Task[] = [];
  isLoading = true;
  showDeleteConfirm = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProject(id);
    }
  }

  loadProject(id: string): void {
    this.projectService.getProject(id).subscribe({
      next: (project) => {
        this.project = project;
        this.loadTasks(id);
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/projects']);
      }
    });
  }

  loadTasks(projectId: string): void {
    this.taskService.getProjectTasks(projectId).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  deleteProject(): void {
    if (!this.project) return;
    this.projectService.deleteProject(this.project._id).subscribe({
      next: () => {
        this.router.navigate(['/projects']);
      },
      error: () => {
        this.showDeleteConfirm = false;
      }
    });
  }

  getMemberName(member: any): string {
    return typeof member.user === 'object' ? member.user.name : 'Usuario';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'planning': 'badge-warning',
      'in-progress': 'badge-primary',
      'completed': 'badge-success'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'planning': 'Planificacion',
      'in-progress': 'En Progreso',
      'completed': 'Completado'
    };
    return labels[status] || status;
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'high': 'bg-destructive',
      'medium': 'bg-warning',
      'low': 'bg-success'
    };
    return colors[priority] || 'bg-muted';
  }

  getTaskStatus(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'in-progress': 'En Progreso',
      'completed': 'Completada'
    };
    return labels[status] || status;
  }

  getTaskStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'pending': 'badge-warning',
      'in-progress': 'badge-primary',
      'completed': 'badge-success'
    };
    return classes[status] || '';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}
