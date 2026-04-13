import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stats-card',
  template: `
    <div class="card">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-muted-foreground">{{ title }}</p>
          <p class="text-3xl font-bold text-foreground mt-1">{{ value }}</p>
        </div>
        <div 
          class="h-12 w-12 rounded-lg flex items-center justify-center"
          [ngClass]="iconBgClass"
        >
          <ng-container [ngSwitch]="icon">
            <svg *ngSwitchCase="'folder'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" [ngClass]="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <svg *ngSwitchCase="'clipboard'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" [ngClass]="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <svg *ngSwitchCase="'check'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" [ngClass]="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg *ngSwitchCase="'calendar'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" [ngClass]="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </ng-container>
        </div>
      </div>
    </div>
  `
})
export class StatsCardComponent {
  @Input() title = '';
  @Input() value: number | string = 0;
  @Input() icon: 'folder' | 'clipboard' | 'check' | 'calendar' = 'folder';
  @Input() color: 'primary' | 'success' | 'warning' | 'accent' = 'primary';

  get iconBgClass(): string {
    const classes: Record<string, string> = {
      primary: 'bg-primary/10',
      success: 'bg-success/10',
      warning: 'bg-warning/10',
      accent: 'bg-accent/10'
    };
    return classes[this.color];
  }

  get iconClass(): string {
    const classes: Record<string, string> = {
      primary: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      accent: 'text-accent'
    };
    return classes[this.color];
  }
}
