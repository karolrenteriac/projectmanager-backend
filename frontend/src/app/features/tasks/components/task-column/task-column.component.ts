import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Task } from '@core/models';

@Component({
  selector: 'app-task-column',
  template: `
    <div class="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      <!-- Column Header -->
      <div class="flex items-center justify-between p-4 border-b border-border">
        <div class="flex items-center gap-2">
          <div 
            class="h-3 w-3 rounded-full"
            [ngClass]="statusColor"
          ></div>
          <h3 class="font-semibold text-foreground">{{ title }}</h3>
          <span class="text-sm text-muted-foreground">({{ tasks.length }})</span>
        </div>
      </div>

      <!-- Tasks List -->
      <div 
        class="flex-1 p-3 space-y-3 overflow-y-auto"
        cdkDropList
        [id]="listId"
        [cdkDropListData]="tasks"
        [cdkDropListConnectedTo]="connectedTo"
        (cdkDropListDropped)="onDrop($event)"
      >
        <app-task-card
          *ngFor="let task of tasks"
          [task]="task"
          cdkDrag
          [cdkDragData]="task"
          (deleted)="taskDeleted.emit()"
        ></app-task-card>

        <div 
          *ngIf="tasks.length === 0" 
          class="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg"
        >
          <p class="text-sm text-muted-foreground">Sin tareas</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 0.5rem;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class TaskColumnComponent {
  @Input() title = '';
  @Input() status = '';
  @Input() tasks: Task[] = [];
  @Input() connectedTo: string[] = [];
  @Input() listId = '';
  @Output() taskDropped = new EventEmitter<{ task: Task; newStatus: string }>();
  @Output() taskDeleted = new EventEmitter<void>();

  get statusColor(): string {
    const colors: Record<string, string> = {
      'pending': 'bg-warning',
      'in-progress': 'bg-primary',
      'completed': 'bg-success'
    };
    return colors[this.status] || 'bg-muted';
  }

  onDrop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const task = event.previousContainer.data[event.previousIndex];
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      this.taskDropped.emit({ task, newStatus: this.status });
    }
  }
}
