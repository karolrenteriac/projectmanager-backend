import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Task, User, Project } from '@core/models';
import { TaskService } from '@core/services/task.service';

@Component({
  selector: 'app-task-card',
  template: `
    <div class="bg-background border border-border rounded-lg p-3 cursor-grab hover:border-primary/50 transition-colors group">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h4 class="text-sm font-medium text-foreground flex-1">{{ task.title }}</h4>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            [routerLink]="['/tasks', task._id, 'edit']"
            class="p-1 rounded hover:bg-secondary"
            title="Editar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button 
            (click)="onDelete($event)"
            class="p-1 rounded hover:bg-destructive/10"
            title="Eliminar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <p *ngIf="task.description" class="text-xs text-muted-foreground mb-3 line-clamp-2">
        {{ task.description }}
      </p>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span 
            class="badge text-xs"
            [ngClass]="priorityClass"
          >
            {{ priorityLabel }}
          </span>
          <span *ngIf="projectName" class="text-xs text-muted-foreground truncate max-w-[100px]">
            {{ projectName }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <span *ngIf="task.dueDate" class="text-xs text-muted-foreground flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ formatDate(task.dueDate) }}
          </span>
          <div 
            *ngIf="assignedUser"
            class="h-6 w-6 rounded-full bg-secondary flex items-center justify-center"
            [title]="assignedUser"
          >
            <span class="text-xs font-medium text-foreground">{{ getInitials(assignedUser) }}</span>
          </div>
        </div>
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
export class TaskCardComponent {
  @Input() task!: Task;
  @Output() deleted = new EventEmitter<void>();

  constructor(private taskService: TaskService) {}

  get priorityClass(): string {
    const classes: Record<string, string> = {
      'high': 'badge-destructive',
      'medium': 'badge-warning',
      'low': 'badge-success'
    };
    return classes[this.task.priority] || '';
  }

  get priorityLabel(): string {
    const labels: Record<string, string> = {
      'high': 'Alta',
      'medium': 'Media',
      'low': 'Baja'
    };
    return labels[this.task.priority] || this.task.priority;
  }

  get projectName(): string {
    if (typeof this.task.project === 'object' && this.task.project) {
      return (this.task.project as Project).name;
    }
    return '';
  }

  get assignedUser(): string {
    if (typeof this.task.assignedTo === 'object' && this.task.assignedTo) {
      return (this.task.assignedTo as User).name;
    }
    return '';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    if (confirm('Eliminar esta tarea?')) {
      this.taskService.deleteTask(this.task._id).subscribe({
        next: () => this.deleted.emit()
      });
    }
  }
}
