import { Injectable, inject } from '@angular/core';
import { PermissionService } from './permission.service';

/** Estado exclusivamente demonstrativo. Não representa autenticação corporativa. */
@Injectable({ providedIn: 'root' })
export class DemoSession {
  private readonly permissions = inject(PermissionService);
  get user(): string { return this.permissions.current().name; }
  get profile(): string { return this.permissions.profiles().find(p => p.code === this.permissions.current().profile)?.name ?? ''; }
  get users() { return this.permissions.users(); }
  online: 'Online' | 'Offline' | 'Sincronizando' = 'Offline';
  pending = 0;
  loggedIn = true;
  login(id: string): void {
    this.permissions.selectDemoUser(id); this.loggedIn = true;
  }
  logout(): void { this.loggedIn = false; }
}
