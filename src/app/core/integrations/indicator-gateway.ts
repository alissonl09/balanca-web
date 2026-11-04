import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { IndicatorInstallation } from '../models/station-settings';

export type CommunicationState = 'Desconectado' | 'Conectando' | 'Conectado' | 'Sem comunicação' | 'Erro';
export const diagnosticResults = ['Conectado','Comunicação estabelecida','Sem dados','Timeout','Host inacessível','Erro'] as const;
export type DiagnosticResult = typeof diagnosticResults[number];
export interface IndicatorGatewayPort { test(stationKey: string, installation: IndicatorInstallation, scenario: DiagnosticResult): Observable<{ state: CommunicationState; message: string }>; }
export const INDICATOR_GATEWAY = new InjectionToken<IndicatorGatewayPort>('INDICATOR_GATEWAY', {
  providedIn: 'root', factory: () => ({ test: (_key, _installation, result) => of({
    state: (result === 'Conectado' || result === 'Comunicação estabelecida' ? 'Conectado' : result === 'Erro' ? 'Erro' : 'Sem comunicação') as CommunicationState,
    message: `${result} (mock — diagnóstico isolado da Pesagem)`
  }).pipe(delay(250)) })
});
@Injectable({ providedIn: 'root' })
export class IndicatorGatewayService {
  private readonly port = inject(INDICATOR_GATEWAY);
  test(key: string, installation: IndicatorInstallation, scenario: DiagnosticResult) { return this.port.test(key, structuredClone(installation), scenario); }
}
