import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from './services/auth.service';
import { ProjectService } from './services/project.service';
import { TaskService } from './services/task.service';
import { ChatService } from './services/chat.service';
import { CalendarService } from './services/calendar.service';
import { DocumentService } from './services/document.service';
import { NotificationService } from './services/notification.service';
import { MetricsService } from './services/metrics.service';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule
  ],
  providers: [
    AuthService,
    ProjectService,
    TaskService,
    ChatService,
    CalendarService,
    DocumentService,
    NotificationService,
    MetricsService
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it only in AppModule.');
    }
  }
}
