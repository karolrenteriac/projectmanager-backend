import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  template: `
    <div 
      class="rounded-full flex items-center justify-center font-medium"
      [ngClass]="[sizeClass, colorClass]"
    >
      <img 
        *ngIf="src" 
        [src]="src" 
        [alt]="name"
        class="w-full h-full rounded-full object-cover"
      />
      <span *ngIf="!src">{{ initials }}</span>
    </div>
  `
})
export class AvatarComponent {
  @Input() name = '';
  @Input() src = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get initials(): string {
    return this.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get sizeClass(): string {
    const sizes = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base'
    };
    return sizes[this.size];
  }

  get colorClass(): string {
    const colors = [
      'bg-primary/20 text-primary',
      'bg-success/20 text-success',
      'bg-warning/20 text-warning',
      'bg-destructive/20 text-destructive'
    ];
    const index = this.name.length % colors.length;
    return colors[index];
  }
}
