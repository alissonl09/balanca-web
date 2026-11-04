import { Injectable, signal } from '@angular/core';
import { ContextoEstacao } from '../models/station';

@Injectable({ providedIn: 'root' })
export class StationContext {
  private readonly current = signal<ContextoEstacao | null>(null);
  readonly contexto = this.current.asReadonly();

  selecionar(contexto: ContextoEstacao): void {
    if (!contexto.unidade.id || !contexto.estacao.id || !contexto.estacao.ativo ||
        contexto.estacao.unidadeId !== contexto.unidade.id) {
      throw new Error('Estação inválida para a unidade selecionada.');
    }
    this.current.set(Object.freeze({
      unidade: Object.freeze({ ...contexto.unidade }),
      estacao: Object.freeze({ ...contexto.estacao })
    }));
  }
  limpar(): void { this.current.set(null); }
}
