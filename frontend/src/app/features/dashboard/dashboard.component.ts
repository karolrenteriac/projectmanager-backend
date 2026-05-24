import { Component, OnInit } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { MetricsService } from '@core/services/metrics.service';
import { ProjectService } from '@core/services/project.service';
import { TaskService } from '@core/services/task.service';
import { CalendarService } from '@core/services/calendar.service';
import { User, DashboardMetrics, Project, Task, CalendarEvent } from '@core/models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  template: `
    <app-layout>
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-foreground">
              Bienvenido, {{ user?.name?.split(' ')[0] || 'Usuario' }}
            </h1>
            <p class="text-muted-foreground">Aqui tienes un resumen de tu actividad</p>
          </div>
          <button 
            routerLink="/projects/new" 
            class="btn btn-primary flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Proyecto
          </button>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-stats-card
            title="Proyectos Activos"
            [value]="metrics?.activeProjects || 0"
            icon="folder"
            color="primary"
          ></app-stats-card>
          <app-stats-card
            title="Tareas Pendientes"
            [value]="metrics?.pendingTasks || 0"
            icon="clipboard"
            color="warning"
          ></app-stats-card>
          <app-stats-card
            title="Completadas"
            [value]="metrics?.completedTasks || 0"
            icon="check"
            color="success"
          ></app-stats-card>
          <app-stats-card
            title="Eventos Proximos"
            [value]="metrics?.upcomingEvents || 0"
            icon="calendar"
            color="accent"
          ></app-stats-card>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Recent Projects -->
          <div class="lg:col-span-2">
            <app-recent-projects [projects]="recentProjects"></app-recent-projects>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <app-recent-tasks [tasks]="recentTasks"></app-recent-tasks>
            <app-upcoming-events [events]="upcomingEvents"></app-upcoming-events>
          </div>
        </div>
      </div>
    </app-layout>
  `
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  metrics: DashboardMetrics | null = null;
  recentProjects: Project[] = [];
  recentTasks: Task[] = [];
  upcomingEvents: CalendarEvent[] = [];
  isLoading = true;

  constructor(
    private authService: AuthService,
    private metricsService: MetricsService,
    private projectService: ProjectService,
    private taskService: TaskService,
    private calendarService: CalendarService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    forkJoin({
      metrics: this.metricsService.getDashboardMetrics(),
      projects: this.projectService.getProjects({ limit: 4 }),
      tasks: this.taskService.getMyTasks(),
      events: this.calendarService.getUpcomingEvents(3)
    }).subscribe({
      next: ({ metrics, projects, tasks, events }) => {
        this.metrics = metrics;
        this.recentProjects = projects.projects;
        this.recentTasks = tasks.slice(0, 5);
        this.upcomingEvents = events;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
