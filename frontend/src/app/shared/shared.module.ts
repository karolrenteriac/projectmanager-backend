import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { LayoutComponent } from './components/layout/layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { LoadingComponent } from './components/loading/loading.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { ModalComponent } from './components/modal/modal.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { AvatarComponent } from './components/avatar/avatar.component';
import { BadgeComponent } from './components/badge/badge.component';

@NgModule({
  declarations: [
    LayoutComponent,
    SidebarComponent,
    HeaderComponent,
    LoadingComponent,
    EmptyStateComponent,
    ModalComponent,
    ConfirmDialogComponent,
    AvatarComponent,
    BadgeComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LayoutComponent,
    SidebarComponent,
    HeaderComponent,
    LoadingComponent,
    EmptyStateComponent,
    ModalComponent,
    ConfirmDialogComponent,
    AvatarComponent,
    BadgeComponent
  ]
})
export class SharedModule { }
