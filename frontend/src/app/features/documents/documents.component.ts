import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DocumentService } from '@core/services/document.service';
import { ProjectService } from '@core/services/project.service';
import { Document, Project } from '@core/models';

@Component({
  selector: 'app-documents',
  template: `
    <app-layout>
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-foreground">Documentos</h1>
            <p class="text-muted-foreground">Gestiona los archivos de tus proyectos</p>
          </div>
          <div class="flex items-center gap-3">
            <select 
              [(ngModel)]="selectedProjectId"
              (change)="loadDocuments()"
              class="input w-48"
            >
              <option value="">Todos los proyectos</option>
              <option *ngFor="let project of projects" [value]="project._id">
                {{ project.name }}
              </option>
            </select>
            <input 
              #fileInput
              type="file"
              (change)="onFileSelect($event)"
              class="hidden"
              multiple
            />
            <button 
              (click)="fileInput.click()"
              class="btn btn-primary flex items-center gap-2"
              [disabled]="!selectedProjectId"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Subir Archivo
            </button>
          </div>
        </div>

        <!-- Upload Progress -->
        <div *ngIf="isUploading" class="card">
          <div class="flex items-center gap-3">
            <svg class="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span class="text-sm text-muted-foreground">Subiendo archivo...</span>
          </div>
        </div>

        <!-- Loading -->
        <app-loading *ngIf="isLoading" message="Cargando documentos..."></app-loading>

        <!-- Empty State -->
        <app-empty-state 
          *ngIf="!isLoading && documents.length === 0"
          title="No hay documentos"
          [description]="selectedProjectId ? 'Sube el primer archivo a este proyecto' : 'Selecciona un proyecto y sube archivos'"
        ></app-empty-state>

        <!-- Documents Grid -->
        <div *ngIf="!isLoading && documents.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div 
            *ngFor="let doc of documents"
            class="card hover:border-primary/50 transition-colors group"
          >
            <div class="flex items-start justify-between mb-3">
              <div 
                class="h-12 w-12 rounded-lg flex items-center justify-center"
                [ngClass]="getFileIconClass(doc.fileType)"
              >
                <span class="text-xs font-bold uppercase">{{ getFileExtension(doc.name) }}</span>
              </div>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  (click)="downloadDocument(doc)"
                  class="p-1.5 rounded hover:bg-secondary"
                  title="Descargar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button 
                  (click)="deleteDocument(doc)"
                  class="p-1.5 rounded hover:bg-destructive/10"
                  title="Eliminar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <h3 class="font-medium text-foreground truncate mb-1" [title]="doc.name">
              {{ doc.name }}
            </h3>
            <p *ngIf="doc.description" class="text-sm text-muted-foreground truncate mb-2">
              {{ doc.description }}
            </p>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ formatFileSize(doc.fileSize) }}</span>
              <span>{{ formatDate(doc.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </app-layout>
  `
})
export class DocumentsComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  documents: Document[] = [];
  projects: Project[] = [];
  selectedProjectId = '';
  isLoading = false;
  isUploading = false;

  constructor(
    private documentService: DocumentService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.projects;
        if (this.projects.length > 0) {
          this.selectedProjectId = this.projects[0]._id;
          this.loadDocuments();
        }
      }
    });
  }

  loadDocuments(): void {
    this.isLoading = true;
    const projectId = this.selectedProjectId || undefined;
    
    this.documentService.getDocuments(projectId).subscribe({
      next: (documents) => {
        this.documents = documents;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.selectedProjectId) return;

    const file = input.files[0];
    this.uploadFile(file);
    input.value = '';
  }

  uploadFile(file: File): void {
    this.isUploading = true;
    this.documentService.uploadDocument(file, this.selectedProjectId).subscribe({
      next: (doc) => {
        this.documents.unshift(doc);
        this.isUploading = false;
      },
      error: () => {
        this.isUploading = false;
      }
    });
  }

  downloadDocument(doc: Document): void {
    this.documentService.downloadDocument(doc._id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  deleteDocument(doc: Document): void {
    if (!confirm('Eliminar este documento?')) return;
    this.documentService.deleteDocument(doc._id).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d._id !== doc._id);
      }
    });
  }

  getFileIconClass(fileType: string): string {
    if (fileType.includes('pdf')) return 'bg-destructive/20 text-destructive';
    if (fileType.includes('image')) return 'bg-success/20 text-success';
    if (fileType.includes('word') || fileType.includes('document')) return 'bg-primary/20 text-primary';
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'bg-success/20 text-success';
    return 'bg-secondary text-muted-foreground';
  }

  getFileExtension(name: string): string {
    return name.split('.').pop()?.toUpperCase() || 'FILE';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  }
}
