import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'pesagem',
    pathMatch: 'full',
  },
  {
    path: 'pesagem',
    loadComponent: () =>
      import('./pages/pesagem/pesagem').then(
        (component) => component.Pesagem,
      ),
  },
  {
    path: 'configuracoes',
    loadComponent: () =>
      import('./pages/configuracoes/configuracoes').then(
        (component) => component.Configuracoes,
      ),
  },
  {
    path: '**',
    redirectTo: 'pesagem',
  },
];