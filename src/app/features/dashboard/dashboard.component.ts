import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports:[CommonModule,TranslateModule],
  template: `<h1>{{ 'COMMON.WELCOME' | translate }}</h1>

<button>{{ 'COMMON.SAVE' | translate }}</button>`,
})
export class DashboardComponent {}
