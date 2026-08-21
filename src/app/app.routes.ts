import { Routes } from '@angular/router';

import {
  configuracoesGuard
} from './guards/configuracoes.guard';


export const routes: Routes = [

  {
    path: '',
    redirectTo: 'pesagem',
    pathMatch: 'full'
  },

  {
    path: 'pesagem',

    loadComponent: () =>
      import(
        './pages/pesagem/pesagem'
      ).then(
        component =>
          component.Pesagem
      )
  },

  {
    path: 'configuracoes',

    loadComponent: () =>
      import(
        './pages/configuracoes/configuracoes'
      ).then(
        component =>
          component.Configuracoes
      ),

    canDeactivate: [
      configuracoesGuard
    ]
  },

  {
    path: '**',
    redirectTo: 'pesagem'
  }

];