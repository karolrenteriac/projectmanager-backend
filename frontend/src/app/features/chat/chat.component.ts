import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService } from '@core/services/chat.service';
import { ProjectService } from '@core/services/project.service';
import { AuthService } from '@core/services/auth.service';
import { ChatMessage, Project, User } from '@core/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  template: `
    <app-layout>
      <div class="flex h-full gap-6">
        <!-- Projects Sidebar -->
        <div class="w-64 flex-shrink-0 card overflow-hidden flex flex-col">
          <h2 class="text-lg font-semibold text-foreground p-4 border-b border-border">Chats de Proyectos</h2>
          <div class="flex-1 overflow-y-auto">
            <button
              *ngFor="let project of projects"
              (click)="selectProject(project)"
              class="w-full text-left p-4 hover:bg-secondary/50 transition-colors border-b border-border"
              [class.bg-primary/10]="selectedProject?._id === project._id"
            >
              <p class="font-medium text-foreground truncate">{{ project.name }}</p>
              <p class="text-xs text-muted-foreground mt-1">{{ project.members?.length || 0 }} miembros</p>
            </button>
            <div *ngIf="projects.length === 0" class="p-4 text-center text-muted-foreground">
              No hay proyectos disponibles
            </div>
          </div>
        </div>

        <!-- Chat Area -->
        <div class="flex-1 card overflow-hidden flex flex-col">
          <div *ngIf="!selectedProject" class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p class="text-muted-foreground">Selecciona un proyecto para ver el chat</p>
            </div>
          </div>

          <ng-container *ngIf="selectedProject">
            <!-- Chat Header -->
            <div class="flex items-center gap-3 p-4 border-b border-border">
              <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-foreground">{{ selectedProject.name }}</h3>
                <p class="text-xs text-muted-foreground">{{ selectedProject.members?.length || 0 }} participantes</p>
              </div>
            </div>

            <!-- Messages -->
            <div #messagesContainer class="flex-1 overflow-y-auto p-4 space-y-4">
              <div *ngIf="messages.length === 0" class="text-center py-8">
                <p class="text-muted-foreground">No hay mensajes aun. Se el primero en escribir!</p>
              </div>
              <div 
                *ngFor="let message of messages"
                class="flex gap-3"
                [class.flex-row-reverse]="isOwnMessage(message)"
              >
                <app-avatar
                  [name]="getSenderName(message)"
                  size="sm"
                ></app-avatar>
                <div 
                  class="max-w-[70%] rounded-lg p-3"
                  [ngClass]="isOwnMessage(message) ? 'bg-primary text-primary-foreground' : 'bg-secondary'"
                >
                  <p class="text-xs font-medium mb-1" [class.text-primary-foreground/70]="isOwnMessage(message)" [class.text-muted-foreground]="!isOwnMessage(message)">
                    {{ getSenderName(message) }}
                  </p>
                  <p class="text-sm">{{ message.content }}</p>
                  <p class="text-xs mt-1" [class.text-primary-foreground/50]="isOwnMessage(message)" [class.text-muted-foreground]="!isOwnMessage(message)">
                    {{ formatTime(message.createdAt) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Input -->
            <div class="p-4 border-t border-border">
              <form (ngSubmit)="sendMessage()" class="flex gap-3">
                <input 
                  type="text"
                  [(ngModel)]="newMessage"
                  name="message"
                  class="input flex-1"
                  placeholder="Escribe un mensaje..."
                  autocomplete="off"
                />
                <button 
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="!newMessage.trim()"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </ng-container>
        </div>
      </div>
    </app-layout>
  `
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  
  projects: Project[] = [];
  selectedProject: Project | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  private messagesSub?: Subscription;
  private currentUserId: string;
  private shouldScroll = false;

  constructor(
    private chatService: ChatService,
    private projectService: ProjectService,
    private authService: AuthService
  ) {
    this.currentUserId = this.authService.currentUser?._id || '';
  }

  ngOnInit(): void {
    this.loadProjects();
    this.messagesSub = this.chatService.messages$.subscribe(messages => {
      this.messages = messages;
      this.shouldScroll = true;
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.messagesSub?.unsubscribe();
    this.chatService.disconnect();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.projects;
      }
    });
  }

  selectProject(project: Project): void {
    if (this.selectedProject?._id === project._id) return;
    
    this.selectedProject = project;
    this.chatService.disconnect();
    this.chatService.connect(project._id);
    
    // Also load messages via HTTP as fallback
    this.chatService.getMessages(project._id).subscribe({
      next: (messages) => {
        if (this.messages.length === 0) {
          this.messages = messages;
          this.shouldScroll = true;
        }
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedProject) return;
    
    this.chatService.sendMessage(this.newMessage.trim(), this.selectedProject._id);
    this.newMessage = '';
  }

  getSenderName(message: ChatMessage): string {
    if (typeof message.sender === 'object') {
      return (message.sender as User).name;
    }
    return 'Usuario';
  }

  isOwnMessage(message: ChatMessage): boolean {
    const senderId = typeof message.sender === 'object' 
      ? (message.sender as User)._id 
      : message.sender;
    return senderId === this.currentUserId;
  }

  formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
