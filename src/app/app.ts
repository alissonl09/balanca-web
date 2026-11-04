import { inject } from '@angular/core';
import { StationContext } from './core/state/station-context';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DemoSession } from './core/state/demo-session';
import { PermissionService } from './core/state/permission.service';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    FormsModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly station = inject(StationContext);
  readonly session = inject(DemoSession);
  readonly auth = inject(PermissionService);
  canSettings():boolean{return ['generalSettings','vehicleSettings','printSettings','indicators','indicatorModels','permissions'].some(p=>this.auth.can(p as import('./core/state/permission.service').Permission));}
  userMenu = false;
  userDialog: 'switch' | 'logout' | null = null;
  nextUser = '';
  applyUser(): void { this.session.login(this.nextUser); this.userDialog = null; }
}
