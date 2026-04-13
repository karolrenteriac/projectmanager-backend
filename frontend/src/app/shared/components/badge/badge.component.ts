import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  template: `
    <span 
      class="badge"
      [ngClass]="variantClass"
    >
      {{ text }}
    </span>
  `
})
export class BadgeComponent {
  @Input() text = '';
  @Input() variant: 'primary' | 'success' | 'warning' | 'destructive' | 'secondary' = 'primary';

  get variantClass(): string {
    const variants: Record<string, string> = {
      primary: 'badge-primary',
      success: 'badge-success',
      warning: 'badge-warning',
      destructive: 'badge-destructive',
      secondary: 'bg-secondary text-secondary-foreground'
    };
    return variants[this.variant];
  }
}
