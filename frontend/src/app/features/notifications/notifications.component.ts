import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../core/models';

@Component({
  selector: 'app-notifications',
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-foreground">Notificaciones</h1>
          <p class="text-muted-foreground mt-1">Mantente al dia con las actualizaciones de tus proyectos</p>
        </div>
        <div class="flex gap-3">
          <button 
            *ngIf="unreadCount > 0"
            (click)="markAllAsRead()"
            class="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            Marcar todas como leidas
          </button>
          <select 
            [(ngModel)]="filter" 
            (change)="filterNotifications()"
            class="px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">Todas</option>
            <option value="unread">No leidas</option>
            <option value="read">Leidas</option>
          </select>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-card border border-border rounded-xl p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-foreground">{{ notifications.length }}</p>
              <p class="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <div class="bg-card border border-border rounded-xl p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-foreground">{{ unreadCount }}</p>
              <p class="text-sm text-muted-foreground">No leidas</p>
            </div>
          </div>
        </div>
        <div class="bg-card border border-border rounded-xl p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-foreground">{{ notifications.length - unreadCount }}</p>
              <p class="text-sm text-muted-foreground">Leidas</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications List -->
      <div class="bg-card border border-border rounded-xl overflow-hidden">
        <app-loading *ngIf="loading"></app-loading>

        <app-empty-state 
          *ngIf="!loading && filteredNotifications.length === 0"
          title="Sin notificaciones"
          description="No tienes notificaciones en este momento"
          icon="bell">
        </app-empty-state>

        <div *ngIf="!loading && filteredNotifications.length > 0" class="divide-y divide-border">
          <div 
            *ngFor="let notification of filteredNotifications"
            [class.bg-primary/5]="!notification.read"
            class="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            (click)="markAsRead(notification)">
            <div class="flex items-start gap-4">
              <div 
                class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                [ngClass]="getNotificationIconClass(notification.type)">
                <svg *ngIf="notification.type === 'task'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
                <svg *ngIf="notification.type === 'project'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <svg *ngIf="notification.type === 'message'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                <svg *ngIf="notification.type === 'system'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h3 class="font-medium text-foreground" [class.font-semibold]="!notification.read">
                    {{ notification.title }}
                  </h3>
                  <span class="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {{ notification.createdAt | date:'short' }}
                  </span>
                </div>
                <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ notification.message }}</p>
              </div>
              <div *ngIf="!notification.read" class="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
            </div>
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
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  loading = true;
  filter = 'all';
  unreadCount = 0;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.filterNotifications();
        this.updateUnreadCount();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filterNotifications(): void {
    switch (this.filter) {
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => !n.read);
        break;
      case 'read':
        this.filteredNotifications = this.notifications.filter(n => n.read);
        break;
      default:
        this.filteredNotifications = [...this.notifications];
    }
  }

  updateUnreadCount(): void {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification._id).subscribe({
        next: () => {
          notification.read = true;
          this.updateUnreadCount();
        }
      });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.read = true);
        this.updateUnreadCount();
        this.filterNotifications();
      }
    });
  }

  getNotificationIconClass(type: string): string {
    const classes: { [key: string]: string } = {
      'task': 'bg-blue-500/10 text-blue-500',
      'project': 'bg-purple-500/10 text-purple-500',
      'message': 'bg-green-500/10 text-green-500',
      'system': 'bg-gray-500/10 text-gray-500'
    };
    return classes[type] || classes['system'];
  }
}
