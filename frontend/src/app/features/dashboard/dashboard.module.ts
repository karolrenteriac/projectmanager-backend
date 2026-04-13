import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@shared/shared.module';

import { DashboardComponent } from './dashboard.component';
import { StatsCardComponent } from './components/stats-card/stats-card.component';
import { RecentProjectsComponent } from './components/recent-projects/recent-projects.component';
import { RecentTasksComponent } from './components/recent-tasks/recent-tasks.component';
import { UpcomingEventsComponent } from './components/upcoming-events/upcoming-events.component';

const routes: Routes = [
  { path: '', component: DashboardComponent }
];

@NgModule({
  declarations: [
    DashboardComponent,
    StatsCardComponent,
    RecentProjectsComponent,
    RecentTasksComponent,
    UpcomingEventsComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class DashboardModule { }
