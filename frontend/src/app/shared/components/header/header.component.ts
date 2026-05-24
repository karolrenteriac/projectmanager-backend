import { Component, OnInit } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { User, Notification } from '@core/models';

@Component({
  selector: 'app-header',
  template: `
    <header class="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div class="flex items-center gap-4">
        <h1 class="text-lg font-semibold text-foreground">Project Manager</h1>
      </div>

      <div class="flex items-center gap-4">
        <!-- Notifications -->
        <div class="relative">
          <button 
            (click)="toggleNotifications()"
            class="relative p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span 
              *ngIf="unreadCount > 0"
              class="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs font-medium rounded-full flex items-center justify-center"
            >
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </button>

          <!-- Notifications Dropdown -->
          <div 
            *ngIf="showNotifications"
            class="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50"
          >
            <div class="flex items-center justify-between px-4 py-3 border-b border-border">
              <span class="font-medium text-foreground">Notificaciones</span>
              <button 
                *ngIf="unreadCount > 0"
                (click)="markAllAsRead()"
                class="text-xs text-primary hover:underline"
              >
                Marcar todas como leidas
              </button>
            </div>
            <div class="max-h-64 overflow-y-auto">
              <div 
                *ngFor="let notification of notifications"
                class="px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/50 cursor-pointer"
                [class.bg-primary/5]="!notification.read"
                (click)="markAsRead(notification)"
              >
                <p class="text-sm font-medium text-foreground">{{ notification.title }}</p>
                <p class="text-xs text-muted-foreground mt-1">{{ notification.message }}</p>
              </div>
              <div *ngIf="notifications.length === 0" class="px-4 py-8 text-center text-muted-foreground">
                No hay notificaciones
              </div>
            </div>
          </div>
        </div>

        <!-- User Menu -->
        <div class="relative">
          <button 
            (click)="toggleUserMenu()"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <div class="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center">
              <span class="text-sm font-medium text-primary">
                {{ user?.name?.charAt(0)?.toUpperCase() || 'U' }}
              </span>
            </div>
            <div class="text-left hidden sm:block">
              <p class="text-sm font-medium text-foreground">{{ user?.name || 'Usuario' }}</p>
              <p class="text-xs text-muted-foreground capitalize">{{ user?.role || 'Rol' }}</p>
            </div>
          </button>

          <!-- User Dropdown -->
          <div 
            *ngIf="showUserMenu"
            class="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50"
          >
            <a 
              routerLink="/profile"
              class="block px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              (click)="showUserMenu = false"
            >
              Mi Perfil
            </a>
            <button 
              (click)="logout()"
              class="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              Cerrar Sesion
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class HeaderComponent implements OnInit {
  user: User | null = null;
  notifications: Notification[] = [];
  unreadCount = 0;
  showNotifications = false;
  showUserMenu = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });

    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });

    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications.slice(0, 5);
      },
      error: () => {}
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification._id).subscribe();
      notification.read = true;
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.read = true);
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
