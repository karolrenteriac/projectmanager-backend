import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService } from '@core/services/project.service';
import { Project } from '@core/models';

@Component({
  selector: 'app-project-form',
  template: `
    <app-layout>
      <div class="max-w-2xl mx-auto">
        <div class="mb-6">
          <a 
            routerLink="/projects" 
            class="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver a proyectos
          </a>
        </div>

        <div class="card">
          <h1 class="text-xl font-bold text-foreground mb-6">
            {{ isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto' }}
          </h1>

          <form [formGroup]="projectForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="space-y-2">
              <label for="name" class="label">Nombre del Proyecto *</label>
              <input 
                id="name"
                type="text" 
                formControlName="name"
                class="input"
                placeholder="Ej: Investigacion de mercado Q4"
              />
              <p *ngIf="projectForm.get('name')?.touched && projectForm.get('name')?.errors?.['required']" 
                 class="text-xs text-destructive">
                El nombre es requerido
              </p>
            </div>

            <div class="space-y-2">
              <label for="description" class="label">Descripcion</label>
              <textarea 
                id="description"
                formControlName="description"
                class="input min-h-[100px] resize-none"
                placeholder="Describe el proyecto..."
              ></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label for="status" class="label">Estado</label>
                <select 
                  id="status"
                  formControlName="status"
                  class="input"
                >
                  <option value="planning">Planificacion</option>
                  <option value="in-progress">En Progreso</option>
                  <option value="completed">Completado</option>
                </select>
              </div>

              <div class="space-y-2">
                <label for="budget" class="label">Presupuesto (USD)</label>
                <input 
                  id="budget"
                  type="number" 
                  formControlName="budget"
                  class="input"
                  placeholder="0.00"
                  min="0"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label for="startDate" class="label">Fecha de Inicio *</label>
                <input 
                  id="startDate"
                  type="date" 
                  formControlName="startDate"
                  class="input"
                />
                <p *ngIf="projectForm.get('startDate')?.touched && projectForm.get('startDate')?.errors?.['required']" 
                   class="text-xs text-destructive">
                  La fecha de inicio es requerida
                </p>
              </div>

              <div class="space-y-2">
                <label for="endDate" class="label">Fecha de Fin</label>
                <input 
                  id="endDate"
                  type="date" 
                  formControlName="endDate"
                  class="input"
                />
              </div>
            </div>

            <div *ngIf="error" class="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p class="text-sm text-destructive">{{ error }}</p>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button 
                type="button"
                routerLink="/projects"
                class="btn btn-secondary"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="projectForm.invalid || isLoading"
              >
                <span *ngIf="isLoading" class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Guardando...
                </span>
                <span *ngIf="!isLoading">{{ isEditing ? 'Actualizar' : 'Crear' }} Proyecto</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </app-layout>
  `
})
export class ProjectFormComponent implements OnInit {
  projectForm: FormGroup;
  isEditing = false;
  isLoading = false;
  error = '';
  projectId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService
  ) {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      status: ['planning'],
      budget: [null],
      startDate: ['', Validators.required],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.isEditing = true;
      this.loadProject();
    }
  }

  loadProject(): void {
    if (!this.projectId) return;
    this.projectService.getProject(this.projectId).subscribe({
      next: (project) => {
        this.projectForm.patchValue({
          name: project.name,
          description: project.description,
          status: project.status,
          budget: project.budget,
          startDate: project.startDate ? this.formatDateForInput(project.startDate) : '',
          endDate: project.endDate ? this.formatDateForInput(project.endDate) : ''
        });
      },
      error: () => {
        this.router.navigate(['/projects']);
      }
    });
  }

  formatDateForInput(date: string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  onSubmit(): void {
    if (this.projectForm.invalid) return;

    this.isLoading = true;
    this.error = '';

    const projectData = this.projectForm.value;

    const request = this.isEditing && this.projectId
      ? this.projectService.updateProject(this.projectId, projectData)
      : this.projectService.createProject(projectData);

    request.subscribe({
      next: (project) => {
        this.router.navigate(['/projects', project._id]);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Error al guardar el proyecto';
      }
    });
  }
}
