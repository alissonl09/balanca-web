import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';

import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

// Registra o formato brasileiro de números e datas.
registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({
      eventCoalescing: true
    }),
    provideRouter(routes),
    provideHttpClient(),

    // Define português do Brasil como padrão da aplicação.
    {
      provide: LOCALE_ID,
      useValue: 'pt-BR'
    }
  ]
};