import { Component, OnInit } from '@angular/core';
import { MetricsService } from '@core/services/metrics.service';
import { ProjectService } from '@core/services/project.service';
import { TaskService } from '@core/services/task.service';
import { Project, Task, DashboardMetrics } from '@core/models';

@Component({
  selector: 'app-reports',
  template: `
    <app-layout>
      <div class="space-y-6">
        <!-- Header -->
        <div>
          <h1 class="text-2xl font-bold text-foreground">Reportes y Metricas</h1>
          <p class="text-muted-foreground">Visualiza el progreso de tus proyectos</p>
        </div>

        <!-- Loading -->
        <app-loading *ngIf="isLoading" message="Cargando metricas..."></app-loading>

        <div *ngIf="!isLoading" class="space-y-6">
          <!-- Overview Stats -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="card">
              <p class="text-sm text-muted-foreground">Total Proyectos</p>
              <p class="text-3xl font-bold text-foreground mt-1">{{ metrics?.totalProjects || 0 }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-xs text-success">{{ metrics?.completedProjects || 0 }} completados</span>
              </div>
            </div>
            <div class="card">
              <p class="text-sm text-muted-foreground">Total Tareas</p>
              <p class="text-3xl font-bold text-foreground mt-1">{{ metrics?.totalTasks || 0 }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-xs text-success">{{ metrics?.completedTasks || 0 }} completadas</span>
              </div>
            </div>
            <div class="card">
              <p class="text-sm text-muted-foreground">Tasa de Completado</p>
              <p class="text-3xl font-bold text-foreground mt-1">{{ completionRate }}%</p>
              <div class="w-full bg-secondary rounded-full h-2 mt-2">
                <div 
                  class="bg-primary h-2 rounded-full transition-all"
                  [style.width.%]="completionRate"
                ></div>
              </div>
            </div>
            <div class="card">
              <p class="text-sm text-muted-foreground">Tareas Pendientes</p>
              <p class="text-3xl font-bold text-warning mt-1">{{ metrics?.pendingTasks || 0 }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-xs text-muted-foreground">requieren atencion</span>
              </div>
            </div>
          </div>

          <!-- Project Progress -->
          <div class="card">
            <h2 class="text-lg font-semibold text-foreground mb-4">Progreso por Proyecto</h2>
            <div *ngIf="projects.length === 0" class="text-center py-8">
              <p class="text-muted-foreground">No hay proyectos para mostrar</p>
            </div>
            <div class="space-y-4">
              <div *ngFor="let project of projects" class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-foreground">{{ project.name }}</span>
                  <span class="text-sm text-muted-foreground">{{ getProjectProgress(project) }}%</span>
                </div>
                <div class="w-full bg-secondary rounded-full h-2">
                  <div 
                    class="h-2 rounded-full transition-all"
                    [ngClass]="getProgressBarClass(project.status)"
                    [style.width.%]="getProjectProgress(project)"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Task Distribution -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card">
              <h2 class="text-lg font-semibold text-foreground mb-4">Distribucion de Tareas</h2>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded-full bg-warning"></div>
                    <span class="text-sm text-foreground">Pendientes</span>
                  </div>
                  <span class="text-sm font-medium text-foreground">{{ taskStats.pending }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded-full bg-primary"></div>
                    <span class="text-sm text-foreground">En Progreso</span>
                  </div>
                  <span class="text-sm font-medium text-foreground">{{ taskStats.inProgress }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded-full bg-success"></div>
                    <span class="text-sm text-foreground">Completadas</span>
                  </div>
                  <span class="text-sm font-medium text-foreground">{{ taskStats.completed }}</span>
                </div>
              </div>

              <!-- Visual Bar -->
              <div class="flex h-4 rounded-full overflow-hidden mt-4">
                <div 
                  class="bg-warning transition-all"
                  [style.width.%]="getTaskPercentage('pending')"
                ></div>
                <div 
                  class="bg-primary transition-all"
                  [style.width.%]="getTaskPercentage('inProgress')"
                ></div>
                <div 
                  class="bg-success transition-all"
                  [style.width.%]="getTaskPercentage('completed')"
                ></div>
              </div>
            </div>

            <div class="card">
              <h2 class="text-lg font-semibold text-foreground mb-4">Estado de Proyectos</h2>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded-full bg-warning"></div>
                    <span class="text-sm text-foreground">Planificacion</span>
                  </div>
                  <span class="text-sm font-medium text-foreground">{{ projectStats.planning }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded-full bg-primary"></div>
                    <span class="text-sm text-foreground">En Progreso</span>
                  </div>
                  <span class="text-sm font-medium text-foreground">{{ projectStats.inProgress }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded-full bg-success"></div>
                    <span class="text-sm text-foreground">Completados</span>
                  </div>
                  <span class="text-sm font-medium text-foreground">{{ projectStats.completed }}</span>
                </div>
              </div>

              <!-- Visual Bar -->
              <div class="flex h-4 rounded-full overflow-hidden mt-4">
                <div 
                  class="bg-warning transition-all"
                  [style.width.%]="getProjectPercentage('planning')"
                ></div>
                <div 
                  class="bg-primary transition-all"
                  [style.width.%]="getProjectPercentage('inProgress')"
                ></div>
                <div 
                  class="bg-success transition-all"
                  [style.width.%]="getProjectPercentage('completed')"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </app-layout>
  `
})
export class ReportsComponent implements OnInit {
  metrics: DashboardMetrics | null = null;
  projects: Project[] = [];
  tasks: Task[] = [];
  isLoading = true;

  constructor(
    private metricsService: MetricsService,
    private projectService: ProjectService,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.metricsService.getDashboardMetrics().subscribe({
      next: (metrics) => {
        this.metrics = metrics;
      }
    });

    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.projects;
      }
    });

    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  get completionRate(): number {
    if (!this.metrics?.totalTasks) return 0;
    return Math.round((this.metrics.completedTasks / this.metrics.totalTasks) * 100);
  }

  get taskStats() {
    return {
      pending: this.tasks.filter(t => t.status === 'pending').length,
      inProgress: this.tasks.filter(t => t.status === 'in-progress').length,
      completed: this.tasks.filter(t => t.status === 'completed').length
    };
  }

  get projectStats() {
    return {
      planning: this.projects.filter(p => p.status === 'planning').length,
      inProgress: this.projects.filter(p => p.status === 'in-progress').length,
      completed: this.projects.filter(p => p.status === 'completed').length
    };
  }

  getProjectProgress(project: Project): number {
    if (project.status === 'completed') return 100;
    if (project.status === 'planning') return 10;
    return 50;
  }

  getProgressBarClass(status: string): string {
    const classes: Record<string, string> = {
      'planning': 'bg-warning',
      'in-progress': 'bg-primary',
      'completed': 'bg-success'
    };
    return classes[status] || 'bg-muted';
  }

  getTaskPercentage(status: string): number {
    const total = this.tasks.length;
    if (!total) return 0;
    const count = status === 'inProgress' 
      ? this.taskStats.inProgress 
      : this.taskStats[status as keyof typeof this.taskStats];
    return (count / total) * 100;
  }

  getProjectPercentage(status: string): number {
    const total = this.projects.length;
    if (!total) return 0;
    const count = status === 'inProgress' 
      ? this.projectStats.inProgress 
      : this.projectStats[status as keyof typeof this.projectStats];
    return (count / total) * 100;
  }
}
