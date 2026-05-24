import { Component, OnInit } from '@angular/core';
import { CalendarService } from '@core/services/calendar.service';
import { CalendarEvent } from '@core/models';

@Component({
  selector: 'app-calendar',
  template: `
    <app-layout>
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-foreground">Calendario</h1>
            <p class="text-muted-foreground">Gestiona eventos y reuniones</p>
          </div>
          <button 
            routerLink="/calendar/new" 
            class="btn btn-primary flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Evento
          </button>
        </div>

        <!-- Calendar Navigation -->
        <div class="card">
          <div class="flex items-center justify-between mb-6">
            <button 
              (click)="previousMonth()"
              class="btn btn-ghost"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 class="text-xl font-semibold text-foreground">
              {{ currentMonthYear }}
            </h2>
            <button 
              (click)="nextMonth()"
              class="btn btn-ghost"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <!-- Calendar Grid -->
          <div class="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            <!-- Week Headers -->
            <div *ngFor="let day of weekDays" class="bg-secondary p-3 text-center">
              <span class="text-sm font-medium text-muted-foreground">{{ day }}</span>
            </div>

            <!-- Calendar Days -->
            <div 
              *ngFor="let day of calendarDays"
              class="bg-card min-h-[100px] p-2"
              [class.bg-secondary/30]="!day.isCurrentMonth"
            >
              <span 
                class="inline-flex items-center justify-center h-7 w-7 rounded-full text-sm"
                [class.bg-primary]="day.isToday"
                [class.text-primary-foreground]="day.isToday"
                [class.text-muted-foreground]="!day.isCurrentMonth"
              >
                {{ day.date }}
              </span>
              <div class="mt-1 space-y-1">
                <div 
                  *ngFor="let event of day.events.slice(0, 2)"
                  class="text-xs p-1 rounded truncate cursor-pointer"
                  [ngClass]="getEventClass(event.type)"
                  [title]="event.title"
                  [routerLink]="['/calendar', event._id, 'edit']"
                >
                  {{ event.title }}
                </div>
                <div 
                  *ngIf="day.events.length > 2" 
                  class="text-xs text-muted-foreground"
                >
                  +{{ day.events.length - 2 }} mas
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Upcoming Events -->
        <div class="card">
          <h3 class="text-lg font-semibold text-foreground mb-4">Proximos Eventos</h3>
          <div *ngIf="upcomingEvents.length === 0" class="text-center py-6">
            <p class="text-muted-foreground">No hay eventos proximos</p>
          </div>
          <div class="space-y-3">
            <div 
              *ngFor="let event of upcomingEvents"
              class="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
            >
              <div 
                class="h-3 w-3 rounded-full"
                [ngClass]="getEventDotClass(event.type)"
              ></div>
              <div class="flex-1">
                <p class="font-medium text-foreground">{{ event.title }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ formatEventDate(event.startDate) }}
                </p>
              </div>
              <a 
                [routerLink]="['/calendar', event._id, 'edit']"
                class="btn btn-ghost btn-sm"
              >
                Editar
              </a>
            </div>
          </div>
        </div>
      </div>
    </app-layout>
  `
})
export class CalendarComponent implements OnInit {
  events: CalendarEvent[] = [];
  upcomingEvents: CalendarEvent[] = [];
  currentDate = new Date();
  calendarDays: any[] = [];
  weekDays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  constructor(private calendarService: CalendarService) {}

  ngOnInit(): void {
    this.loadEvents();
    this.generateCalendar();
  }

  loadEvents(): void {
    const startDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const endDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

    this.calendarService.getEvents({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }).subscribe({
      next: (events) => {
        this.events = events;
        this.generateCalendar();
      }
    });

    this.calendarService.getUpcomingEvents(5).subscribe({
      next: (events) => {
        this.upcomingEvents = events;
      }
    });
  }

  get currentMonthYear(): string {
    return this.currentDate.toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });
  }

  previousMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.loadEvents();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.loadEvents();
  }

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();

    this.calendarDays = [];

    // Previous month days
    for (let i = 0; i < firstDay.getDay(); i++) {
      const date = new Date(year, month, -firstDay.getDay() + i + 1);
      this.calendarDays.push({
        date: date.getDate(),
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const dayEvents = this.events.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate.getDate() === i && 
               eventDate.getMonth() === month && 
               eventDate.getFullYear() === year;
      });

      this.calendarDays.push({
        date: i,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        events: dayEvents
      });
    }

    // Next month days
    const remainingDays = 42 - this.calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      this.calendarDays.push({
        date: i,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }
  }

  getEventClass(type: string): string {
    const classes: Record<string, string> = {
      'meeting': 'bg-primary/20 text-primary',
      'deadline': 'bg-destructive/20 text-destructive',
      'reminder': 'bg-warning/20 text-warning',
      'other': 'bg-secondary text-secondary-foreground'
    };
    return classes[type] || classes['other'];
  }

  getEventDotClass(type: string): string {
    const classes: Record<string, string> = {
      'meeting': 'bg-primary',
      'deadline': 'bg-destructive',
      'reminder': 'bg-warning',
      'other': 'bg-muted'
    };
    return classes[type] || classes['other'];
  }

  formatEventDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
