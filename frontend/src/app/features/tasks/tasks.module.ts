import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SharedModule } from '@shared/shared.module';

import { TaskBoardComponent } from './task-board/task-board.component';
import { TaskColumnComponent } from './components/task-column/task-column.component';
import { TaskCardComponent } from './components/task-card/task-card.component';
import { TaskFormComponent } from './task-form/task-form.component';

const routes: Routes = [
  { path: '', component: TaskBoardComponent },
  { path: 'new', component: TaskFormComponent },
  { path: ':id/edit', component: TaskFormComponent }
];

@NgModule({
  declarations: [
    TaskBoardComponent,
    TaskColumnComponent,
    TaskCardComponent,
    TaskFormComponent
  ],
  imports: [
    SharedModule,
    DragDropModule,
    RouterModule.forChild(routes)
  ]
})
export class TasksModule { }
