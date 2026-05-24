import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@shared/shared.module';

import { ChatComponent } from './chat.component';

const routes: Routes = [
  { path: '', component: ChatComponent }
];

@NgModule({
  declarations: [
    ChatComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class ChatModule { }
