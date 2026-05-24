import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService } from '@core/services/task.service';
import { ProjectService } from '@core/services/project.service';
import { Project } from '@core/models';

@Component({
  selector: 'app-task-form',
  template: `
    <app-layout>
      <div class="max-w-2xl mx-auto">
        <div class="mb-6">
          <a 
            routerLink="/tasks" 
            class="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver al tablero
          </a>
        </div>

        <div class="card">
          <h1 class="text-xl font-bold text-foreground mb-6">
            {{ isEditing ? 'Editar Tarea' : 'Nueva Tarea' }}
          </h1>

          <form [formGroup]="taskForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="space-y-2">
              <label for="title" class="label">Titulo *</label>
              <input 
                id="title"
                type="text" 
                formControlName="title"
                class="input"
                placeholder="Ej: Revisar documentacion"
              />
              <p *ngIf="taskForm.get('title')?.touched && taskForm.get('title')?.errors?.['required']" 
                 class="text-xs text-destructive">
                El titulo es requerido
              </p>
            </div>

            <div class="space-y-2">
              <label for="description" class="label">Descripcion</label>
              <textarea 
                id="description"
                formControlName="description"
                class="input min-h-[100px] resize-none"
                placeholder="Describe la tarea..."
              ></textarea>
            </div>

            <div class="space-y-2">
              <label for="project" class="label">Proyecto *</label>
              <select 
                id="project"
                formControlName="project"
                class="input"
              >
                <option value="">Selecciona un proyecto</option>
                <option *ngFor="let project of projects" [value]="project._id">
                  {{ project.name }}
                </option>
              </select>
              <p *ngIf="taskForm.get('project')?.touched && taskForm.get('project')?.errors?.['required']" 
                 class="text-xs text-destructive">
                El proyecto es requerido
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label for="status" class="label">Estado</label>
                <select 
                  id="status"
                  formControlName="status"
                  class="input"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in-progress">En Progreso</option>
                  <option value="completed">Completada</option>
                </select>
              </div>

              <div class="space-y-2">
                <label for="priority" class="label">Prioridad</label>
                <select 
                  id="priority"
                  formControlName="priority"
                  class="input"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label for="dueDate" class="label">Fecha limite</label>
              <input 
                id="dueDate"
                type="date" 
                formControlName="dueDate"
                class="input"
              />
            </div>

            <div *ngIf="error" class="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p class="text-sm text-destructive">{{ error }}</p>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button 
                type="button"
                routerLink="/tasks"
                class="btn btn-secondary"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="taskForm.invalid || isLoading"
              >
                <span *ngIf="isLoading" class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Guardando...
                </span>
                <span *ngIf="!isLoading">{{ isEditing ? 'Actualizar' : 'Crear' }} Tarea</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </app-layout>
  `
})
export class TaskFormComponent implements OnInit {
  taskForm: FormGroup;
  projects: Project[] = [];
  isEditing = false;
  isLoading = false;
  error = '';
  taskId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private projectService: ProjectService
  ) {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      project: ['', Validators.required],
      status: ['pending'],
      priority: ['medium'],
      dueDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadProjects();
    this.taskId = this.route.snapshot.paramMap.get('id');
    if (this.taskId) {
      this.isEditing = true;
      this.loadTask();
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.projects;
      }
    });
  }

  loadTask(): void {
    if (!this.taskId) return;
    this.taskService.getTask(this.taskId).subscribe({
      next: (task) => {
        const projectId = typeof task.project === 'object' ? task.project._id : task.project;
        this.taskForm.patchValue({
          title: task.title,
          description: task.description,
          project: projectId,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? this.formatDateForInput(task.dueDate) : ''
        });
      },
      error: () => {
        this.router.navigate(['/tasks']);
      }
    });
  }

  formatDateForInput(date: string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  onSubmit(): void {
    if (this.taskForm.invalid) return;

    this.isLoading = true;
    this.error = '';

    const taskData = this.taskForm.value;

    const request = this.isEditing && this.taskId
      ? this.taskService.updateTask(this.taskId, taskData)
      : this.taskService.createTask(taskData);

    request.subscribe({
      next: () => {
        this.router.navigate(['/tasks']);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Error al guardar la tarea';
      }
    });
  }
}
