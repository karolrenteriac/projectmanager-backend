import { Component } from '@angular/core';

@Component({
  selector: 'app-layout',
  template: `
    <div class="flex h-screen bg-background">
      <app-sidebar></app-sidebar>
      <div class="flex flex-col flex-1 overflow-hidden">
        <app-header></app-header>
        <main class="flex-1 overflow-y-auto p-6">
          <ng-content></ng-content>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class LayoutComponent { }
