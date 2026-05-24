import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CalendarService } from '@core/services/calendar.service';
import { ProjectService } from '@core/services/project.service';
import { Project } from '@core/models';

@Component({
  selector: 'app-event-form',
  template: `
    <app-layout>
      <div class="max-w-2xl mx-auto">
        <div class="mb-6">
          <a 
            routerLink="/calendar" 
            class="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver al calendario
          </a>
        </div>

        <div class="card">
          <h1 class="text-xl font-bold text-foreground mb-6">
            {{ isEditing ? 'Editar Evento' : 'Nuevo Evento' }}
          </h1>

          <form [formGroup]="eventForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="space-y-2">
              <label for="title" class="label">Titulo *</label>
              <input 
                id="title"
                type="text" 
                formControlName="title"
                class="input"
                placeholder="Ej: Reunion de equipo"
              />
            </div>

            <div class="space-y-2">
              <label for="description" class="label">Descripcion</label>
              <textarea 
                id="description"
                formControlName="description"
                class="input min-h-[80px] resize-none"
                placeholder="Describe el evento..."
              ></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label for="type" class="label">Tipo</label>
                <select id="type" formControlName="type" class="input">
                  <option value="meeting">Reunion</option>
                  <option value="deadline">Fecha limite</option>
                  <option value="reminder">Recordatorio</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div class="space-y-2">
                <label for="project" class="label">Proyecto</label>
                <select id="project" formControlName="project" class="input">
                  <option value="">Sin proyecto</option>
                  <option *ngFor="let project of projects" [value]="project._id">
                    {{ project.name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label for="startDate" class="label">Inicio *</label>
                <input id="startDate" type="datetime-local" formControlName="startDate" class="input" />
              </div>
              <div class="space-y-2">
                <label for="endDate" class="label">Fin *</label>
                <input id="endDate" type="datetime-local" formControlName="endDate" class="input" />
              </div>
            </div>

            <div *ngIf="error" class="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p class="text-sm text-destructive">{{ error }}</p>
            </div>

            <div class="flex justify-between pt-4">
              <button 
                *ngIf="isEditing"
                type="button"
                (click)="deleteEvent()"
                class="btn btn-destructive"
              >
                Eliminar
              </button>
              <div class="flex gap-3 ml-auto">
                <button type="button" routerLink="/calendar" class="btn btn-secondary">Cancelar</button>
                <button type="submit" class="btn btn-primary" [disabled]="eventForm.invalid || isLoading">
                  {{ isLoading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear') }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </app-layout>
  `
})
export class EventFormComponent implements OnInit {
  eventForm: FormGroup;
  projects: Project[] = [];
  isEditing = false;
  isLoading = false;
  error = '';
  eventId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private calendarService: CalendarService,
    private projectService: ProjectService
  ) {
    this.eventForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      type: ['meeting'],
      project: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadProjects();
    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEditing = true;
      this.loadEvent();
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (response) => this.projects = response.projects
    });
  }

  loadEvent(): void {
    if (!this.eventId) return;
    this.calendarService.getEvent(this.eventId).subscribe({
      next: (event) => {
        const projectId = typeof event.project === 'object' ? event.project?._id : event.project;
        this.eventForm.patchValue({
          title: event.title,
          description: event.description,
          type: event.type,
          project: projectId || '',
          startDate: this.formatDatetimeLocal(event.startDate),
          endDate: this.formatDatetimeLocal(event.endDate)
        });
      },
      error: () => this.router.navigate(['/calendar'])
    });
  }

  formatDatetimeLocal(date: string): string {
    return new Date(date).toISOString().slice(0, 16);
  }

  onSubmit(): void {
    if (this.eventForm.invalid) return;
    this.isLoading = true;
    this.error = '';

    const eventData = { ...this.eventForm.value };
    if (!eventData.project) delete eventData.project;

    const request = this.isEditing && this.eventId
      ? this.calendarService.updateEvent(this.eventId, eventData)
      : this.calendarService.createEvent(eventData);

    request.subscribe({
      next: () => this.router.navigate(['/calendar']),
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Error al guardar el evento';
      }
    });
  }

  deleteEvent(): void {
    if (!this.eventId || !confirm('Eliminar este evento?')) return;
    this.calendarService.deleteEvent(this.eventId).subscribe({
      next: () => this.router.navigate(['/calendar'])
    });
  }
}
