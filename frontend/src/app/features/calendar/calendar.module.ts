import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@shared/shared.module';

import { CalendarComponent } from './calendar.component';
import { EventFormComponent } from './event-form/event-form.component';

const routes: Routes = [
  { path: '', component: CalendarComponent },
  { path: 'new', component: EventFormComponent },
  { path: ':id/edit', component: EventFormComponent }
];

@NgModule({
  declarations: [
    CalendarComponent,
    EventFormComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class CalendarModule { }
