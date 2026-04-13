import { Component, Input } from '@angular/core';
import { Project } from '@core/models';

@Component({
  selector: 'app-recent-projects',
  template: `
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-foreground">Proyectos Recientes</h2>
        <a routerLink="/projects" class="text-sm text-primary hover:underline">Ver todos</a>
      </div>

      <div *ngIf="projects.length === 0" class="text-center py-8">
        <p class="text-muted-foreground">No hay proyectos todavia</p>
        <a routerLink="/projects/new" class="text-primary hover:underline text-sm mt-2 inline-block">
          Crear primer proyecto
        </a>
      </div>

      <div *ngIf="projects.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a 
          *ngFor="let project of projects"
          [routerLink]="['/projects', project._id]"
          class="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-foreground truncate">{{ project.name }}</h3>
              <p class="text-sm text-muted-foreground mt-1 line-clamp-2">
                {{ project.description || 'Sin descripcion' }}
              </p>
            </div>
            <span 
              class="badge ml-2 flex-shrink-0"
              [ngClass]="getStatusClass(project.status)"
            >
              {{ getStatusLabel(project.status) }}
            </span>
          </div>
          <div class="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              {{ project.members?.length || 0 }} miembros
            </span>
            <span class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ formatDate(project.startDate) }}
            </span>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class RecentProjectsComponent {
  @Input() projects: Project[] = [];

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'planning': 'badge-warning',
      'in-progress': 'badge-primary',
      'completed': 'badge-success'
    };
    return classes[status] || 'badge-secondary';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'planning': 'Planificacion',
      'in-progress': 'En Progreso',
      'completed': 'Completado'
    };
    return labels[status] || status;
  }

  formatDate(date: string): string {
    if (!date) return 'Sin fecha';
    return new Date(date).toLocaleDateString('es-ES', { 
      day: 'numeric',
      month: 'short'
    });
  }
}
