import { Component, Input } from '@angular/core';
import { CalendarEvent } from '@core/models';

@Component({
  selector: 'app-upcoming-events',
  template: `
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-foreground">Proximos Eventos</h2>
        <a routerLink="/calendar" class="text-sm text-primary hover:underline">Ver calendario</a>
      </div>

      <div *ngIf="events.length === 0" class="text-center py-6">
        <p class="text-sm text-muted-foreground">No hay eventos proximos</p>
      </div>

      <div *ngIf="events.length > 0" class="space-y-3">
        <div 
          *ngFor="let event of events"
          class="flex gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <div class="flex flex-col items-center justify-center bg-primary/10 rounded-lg px-3 py-2 min-w-[60px]">
            <span class="text-xs text-primary uppercase">{{ getMonth(event.startDate) }}</span>
            <span class="text-xl font-bold text-primary">{{ getDay(event.startDate) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-foreground truncate">{{ event.title }}</p>
            <p class="text-xs text-muted-foreground mt-1">
              {{ getTime(event.startDate) }} - {{ getTime(event.endDate) }}
            </p>
            <span 
              class="badge text-xs mt-2"
              [ngClass]="getTypeClass(event.type)"
            >
              {{ getTypeLabel(event.type) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UpcomingEventsComponent {
  @Input() events: CalendarEvent[] = [];

  getMonth(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', { month: 'short' });
  }

  getDay(date: string): string {
    return new Date(date).getDate().toString();
  }

  getTime(date: string): string {
    return new Date(date).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      'meeting': 'badge-primary',
      'deadline': 'badge-destructive',
      'reminder': 'badge-warning',
      'other': 'bg-secondary text-secondary-foreground'
    };
    return classes[type] || '';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'meeting': 'Reunion',
      'deadline': 'Fecha limite',
      'reminder': 'Recordatorio',
      'other': 'Otro'
    };
    return labels[type] || type;
  }
}
