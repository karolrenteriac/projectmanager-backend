import { Component, Input } from '@angular/core';
import { Task } from '@core/models';

@Component({
  selector: 'app-recent-tasks',
  template: `
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-foreground">Mis Tareas</h2>
        <a routerLink="/tasks" class="text-sm text-primary hover:underline">Ver todas</a>
      </div>

      <div *ngIf="tasks.length === 0" class="text-center py-6">
        <p class="text-sm text-muted-foreground">No tienes tareas asignadas</p>
      </div>

      <div *ngIf="tasks.length > 0" class="space-y-3">
        <div 
          *ngFor="let task of tasks"
          class="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <div 
            class="h-2 w-2 rounded-full mt-2 flex-shrink-0"
            [ngClass]="getPriorityColor(task.priority)"
          ></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-foreground truncate">{{ task.title }}</p>
            <div class="flex items-center gap-2 mt-1">
              <span 
                class="badge text-xs"
                [ngClass]="getStatusClass(task.status)"
              >
                {{ getStatusLabel(task.status) }}
              </span>
              <span *ngIf="task.dueDate" class="text-xs text-muted-foreground">
                {{ formatDate(task.dueDate) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RecentTasksComponent {
  @Input() tasks: Task[] = [];

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'high': 'bg-destructive',
      'medium': 'bg-warning',
      'low': 'bg-success'
    };
    return colors[priority] || 'bg-muted';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'pending': 'bg-warning/20 text-warning',
      'in-progress': 'bg-primary/20 text-primary',
      'completed': 'bg-success/20 text-success'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'in-progress': 'En Progreso',
      'completed': 'Completada'
    };
    return labels[status] || status;
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    const today = new Date();
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return 'Vencida';
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Manana';
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
}
