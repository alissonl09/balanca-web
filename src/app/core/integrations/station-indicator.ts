import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LeituraEstacao } from '../models/station';

export interface StationIndicatorPort {
  observar(estacaoId: string): Observable<LeituraEstacao>;
}
/** Adapter não configurado: não inventa transporte nem simula equipamento. */
export const STATION_INDICATOR = new InjectionToken<StationIndicatorPort>('STATION_INDICATOR', {
  providedIn: 'root',
  factory: () => ({ observar: () => of({
    peso: null, unidade: 'kg', conectado: false, estavel: false,
    dataHoraLeitura: null, erro: 'Serviço da estação ainda não configurado.'
  }) })
});
@Injectable({ providedIn: 'root' })
export class StationIndicator {
  private readonly port = inject(STATION_INDICATOR);
  observar(estacaoId: string): Observable<LeituraEstacao> {
    return this.port.observar(estacaoId);
  }
}
