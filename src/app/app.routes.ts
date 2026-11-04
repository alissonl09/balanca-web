import { Routes } from '@angular/router';

import {
  configuracoesGuard
} from './guards/configuracoes.guard';


export const routes: Routes = [
  { path:'cadastros',loadComponent:()=>import('./pages/cadastros/cadastros').then(m=>m.Cadastros),
    canDeactivate:[(component: import('./pages/cadastros/cadastros').Cadastros)=>!component.draft||component.view||window.confirm('Descartar o formulário de cadastro não salvo?')] },
  { path:'relatorios',loadComponent:()=>import('./pages/relatorios/relatorios').then(m=>m.Relatorios) },
  { path:'tickets',loadComponent:()=>import('./pages/tickets/tickets').then(m=>m.Tickets) },

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
