import { Component, OnInit } from '@angular/core';
import { ProjectService } from '@core/services/project.service';
import { Project } from '@core/models';

@Component({
  selector: 'app-project-list',
  template: `
    <app-layout>
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-foreground">Proyectos</h1>
            <p class="text-muted-foreground">Gestiona todos tus proyectos de investigacion</p>
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

        <!-- Filters -->
        <div class="flex flex-wrap gap-2">
          <button 
            *ngFor="let filter of filters"
            (click)="setFilter(filter.value)"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            [ngClass]="activeFilter === filter.value 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
          >
            {{ filter.label }}
          </button>
        </div>

        <!-- Loading -->
        <app-loading *ngIf="isLoading" message="Cargando proyectos..."></app-loading>

        <!-- Empty State -->
        <app-empty-state 
          *ngIf="!isLoading && projects.length === 0"
          title="No hay proyectos"
          description="Crea tu primer proyecto para comenzar a gestionar tus investigaciones."
          actionLabel="Crear Proyecto"
          (action)="goToCreate()"
        ></app-empty-state>

        <!-- Projects Grid -->
        <div *ngIf="!isLoading && projects.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <app-project-card 
            *ngFor="let project of filteredProjects"
            [project]="project"
          ></app-project-card>
        </div>
      </div>
    </app-layout>
  `
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  isLoading = true;
  activeFilter = 'all';

  filters = [
    { label: 'Todos', value: 'all' },
    { label: 'Planificacion', value: 'planning' },
    { label: 'En Progreso', value: 'in-progress' },
    { label: 'Completados', value: 'completed' }
  ];

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading = true;
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.projects;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  get filteredProjects(): Project[] {
    if (this.activeFilter === 'all') {
      return this.projects;
    }
    return this.projects.filter(p => p.status === this.activeFilter);
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  goToCreate(): void {
    window.location.href = '/projects/new';
  }
}
