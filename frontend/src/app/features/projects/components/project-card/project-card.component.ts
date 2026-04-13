import { Component, Input } from '@angular/core';
import { Project, User } from '@core/models';

@Component({
  selector: 'app-project-card',
  template: `
    <a 
      [routerLink]="['/projects', project._id]"
      class="card block hover:border-primary/50 transition-colors group"
    >
      <div class="flex items-start justify-between mb-3">
        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <span 
          class="badge"
          [ngClass]="getStatusClass(project.status)"
        >
          {{ getStatusLabel(project.status) }}
        </span>
      </div>

      <h3 class="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
        {{ project.name }}
      </h3>
      <p class="text-sm text-muted-foreground line-clamp-2 mb-4">
        {{ project.description || 'Sin descripcion' }}
      </p>

      <div class="flex items-center justify-between pt-3 border-t border-border">
        <div class="flex -space-x-2">
          <div 
            *ngFor="let member of displayMembers; let i = index"
            class="h-7 w-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center"
            [title]="getMemberName(member)"
          >
            <span class="text-xs font-medium text-foreground">
              {{ getMemberInitials(member) }}
            </span>
          </div>
          <div 
            *ngIf="remainingMembers > 0"
            class="h-7 w-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center"
          >
            <span class="text-xs font-medium text-primary">+{{ remainingMembers }}</span>
          </div>
        </div>
        <span class="text-xs text-muted-foreground">
          {{ formatDate(project.startDate) }}
        </span>
      </div>
    </a>
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
export class ProjectCardComponent {
  @Input() project!: Project;

  get displayMembers() {
    return this.project.members?.slice(0, 3) || [];
  }

  get remainingMembers(): number {
    return Math.max(0, (this.project.members?.length || 0) - 3);
  }

  getMemberName(member: any): string {
    if (typeof member.user === 'object') {
      return member.user.name || 'Usuario';
    }
    return 'Usuario';
  }

  getMemberInitials(member: any): string {
    const name = this.getMemberName(member);
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
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

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
