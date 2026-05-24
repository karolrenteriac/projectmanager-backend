import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <app-modal [isOpen]="isOpen" [title]="title" (close)="cancel.emit()" size="sm">
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">{{ message }}</p>
        <div class="flex justify-end gap-3">
          <button 
            (click)="cancel.emit()"
            class="btn btn-secondary"
          >
            {{ cancelText }}
          </button>
          <button 
            (click)="confirm.emit()"
            class="btn"
            [ngClass]="confirmVariant === 'destructive' ? 'btn-destructive' : 'btn-primary'"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </app-modal>
  `
})
export class ConfirmDialogComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirmar accion';
  @Input() message = 'Esta seguro de que desea continuar?';
  @Input() confirmText = 'Confirmar';
  @Input() cancelText = 'Cancelar';
  @Input() confirmVariant: 'primary' | 'destructive' = 'primary';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
