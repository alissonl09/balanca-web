import { Injectable } from '@angular/core';
import { LeituraEstacao } from '../../core/models/station';
import { Operation } from './pesagem-state';
import { sanitizeDisplayText } from '../../core/models/station-settings';

/** Fixtures locais de desenvolvimento. Nunca usadas como fallback silencioso da Libra. */
@Injectable()
export class PesagemMocks {
  readonly label = 'Simulação local — sem gravação corporativa ou comandos físicos';
  reading: LeituraEstacao = { peso: 0, unidade: 'kg', conectado: false, estavel: false, dataHoraLeitura: null, erro: null };
  sgv = true;
  inverted = false;
  gatesEnabled = true;
  lightsEnabled = true;
  displayEnabled = true;
  display = 'COOXUPÉ • BALANÇA';
  gates: Record<string, 'fechada' | 'aberta' | 'movendo' | 'erro'> = { entrada: 'fechada', saida: 'fechada' };
  private assignments: Record<string,string> | null = null;
  bindEquipments(entry: string, exit: string): void {
    this.assignments = { entrada: entry || 'unassigned-entry', saida: exit || 'unassigned-exit' };
    for (const id of Object.values(this.assignments)) this.gates[id] ??= 'fechada';
  }
  light: Record<string, boolean> = { entrada: false, saida: false };
  equipment(side: string): string { return this.assignments?.[side] ?? (this.inverted ? (side === 'entrada' ? 'saida' : 'entrada') : side); }
  toggleGate(side: string): void {
    const id = this.equipment(side);
    this.gates[id] = this.gates[id] === 'aberta' ? 'fechada' : 'aberta';
  }
  get displayText(): string {
    return sanitizeDisplayText(this.display);
  }
  updateReading(peso: number, conectado: boolean, estavel: boolean): void {
    this.reading = { peso, conectado, estavel, unidade: 'kg', dataHoraLeitura: new Date().toISOString(), erro: conectado ? null : 'Sem comunicação (mock)' };
  }
  authorize(user: string, password: string, justification: string, allowed: boolean): boolean {
    // Credencial exclusivamente demonstrativa, exibida no modal. Não é autenticação de produção.
    return allowed && user === 'demo' && password === 'demo' && justification.trim().length > 0;
  }
  lookup(plate: string): { operation: Operation; trailers: string[]; first: number } | null {
    const trailers: Record<string, string[]> = { ABC1D23: ['DEF4G56', 'XYZ9H87'], DEF2E34: ['GHI5J67'], GHI3F45: ['JKL6M78'] };
    if (!trailers[plate]) return null;
    return { operation: { Motorista: 'José Antônio dos Santos Oliveira', Transportadora: 'Transportadora de demonstração',
      'Emissor(es)': 'Cooxupé; Produtores Associados', 'Depósito': 'Armazém Guaxupé',
      'Tipo do documento': 'Nota Fiscal', 'Nº Nota(s) / Documento(s)': '000123456; 000123457',
      'Peso N.F. (Kg)': '28450', Embalagem: 'Granel' }, trailers: trailers[plate], first: plate === 'DEF2E34' ? 28450 : 0 };
  }
  readonly vehicles = [
    { placa: 'ABC1D23', carreta: null, local: 'operacao' },
    { placa: 'ABC1D23', carreta: 'XYZ9H87', local: 'operacao' },
    { placa: 'DEF2E34', carreta: null, local: 'operacao' },
    { placa: 'GHI3F45', carreta: 'JKL6M78', local: 'operacao' },
    { placa: 'RST7K89', carreta: null, local: 'patio' },
    { placa: 'XYZ9M01', carreta: 'ABC2N34', local: 'patio' }
  ];
}
