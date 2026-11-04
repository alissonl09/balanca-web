import { Injectable, InjectionToken } from '@angular/core';

export type Phase = 'nova' | 'aberta' | 'fechada';
export type Action = 'imprimir' | 'nova' | 'salvar' | 'manual' | 'pesar';
export type Operation = Record<string, string>;
export const fields = ['Motorista', 'Transportadora', 'Emissor(es)', 'Depósito', 'Item',
  'Tipo do documento', 'Nº Nota(s) / Documento(s)', 'Peso N.F. (Kg)', 'Embalagem', 'Operador', 'Observação'];
export interface Capture { peso: number; data: string; autorizador?: string; justificativa?: string; }
export interface Preview { placa: string; carreta: string; operacao: Operation; captura: Capture | null; peso: number; fase: Phase; }
export interface PrintPort { preview(value: Preview): Preview; }
// Preview em memória; substituir pela porta do agente quando houver contrato.
export const PRINT_PORT = new InjectionToken<PrintPort>('PRINT_PORT', {
  providedIn: 'root', factory: () => ({ preview: value => structuredClone(value) })
});
@Injectable({ providedIn: 'root' })
export class PesagemState {
  localId = `MOCK-P-${crypto.randomUUID()}`;
  stationKey = '';
  phase: Phase = 'nova';
  placa = '';
  carreta = '';
  consulted = false;
  trailers: string[] = [];
  draft: Operation = {};
  official: Operation = {};
  saved: Operation = {};
  captures: Capture[] = [];
  confirmed: Preview | null = null;
  first = 0; second = 0; net = 0; dry = 0;
  permissions = { weigh: true, editOpen: true, useManual: true, authorizeManual: true, print: true };
  manualEnabled = false;
  can(action: Action, connected: boolean): boolean {
    switch (action) {
      case 'nova': case 'pesar': return this.permissions.weigh;
      case 'salvar': return this.phase === 'aberta' && this.permissions.editOpen;
      case 'manual': return (this.manualEnabled || !connected) && this.permissions.weigh && this.permissions.useManual;
      case 'imprimir': return this.permissions.print;
    }
  }
  reset(): void {
    this.localId = `MOCK-P-${crypto.randomUUID()}`;
    this.phase = 'nova'; this.placa = ''; this.carreta = ''; this.consulted = false;
    this.trailers = []; this.draft = {}; this.official = {}; this.saved = {};
    this.captures = []; this.confirmed = null;
    this.first = this.second = this.net = this.dry = 0;
  }
  integrate(operation: Operation, trailers: string[], first = 0): void {
    this.official = { ...operation }; this.draft = { ...operation };
    this.consulted = true;
    this.trailers = [...new Set(trailers.map(normalizePlate).filter(Boolean))];
    this.carreta = this.trailers.length === 1 ? this.trailers[0] : '';
    this.first = first; this.phase = first > 0 ? 'aberta' : 'nova';
  }
  save(): void {
    if (!this.can('salvar', false)) throw new Error('Somente pesagem aberta permite salvar.');
    this.validateOfficial();
    this.saved = { ...this.draft };
    if (this.confirmed) this.confirmed = { ...this.confirmed, operacao: { ...this.draft } };
  }
  validateOfficial(): void {
    for (const key of Object.keys(this.official)) {
      if (this.draft[key] !== this.official[key]) throw new Error('Dados integrados não podem ser alterados.');
    }
    if (this.saved['Operador'] && this.draft['Operador'] !== this.saved['Operador']) {
      throw new Error('Operador é definido pela sessão.');
    }
  }
  preview(peso: number, captura: Capture | null): Preview {
    return { placa: normalizePlate(this.placa), carreta: normalizePlate(this.carreta),
      operacao: { ...this.draft }, peso, captura, fase: this.phase };
  }
  confirm(value: Preview): void {
    if (this.phase === 'fechada' || value.fase !== this.phase) throw new Error('Inicie uma nova pesagem.');
    this.validateOfficial();
    const capture = value.captura;
    if (capture?.autorizador && !capture.justificativa?.trim()) throw new Error('Justificativa obrigatória.');
    if (capture && capture.peso > 0 && Number.isFinite(capture.peso)) {
      if (this.phase === 'nova') { this.first = capture.peso; this.phase = 'aberta'; }
      else { this.second = capture.peso; this.phase = 'fechada'; }
      this.captures = [...this.captures, { ...capture }];
      this.confirmed = { ...structuredClone(value), fase: this.phase };
      this.saved = { ...value.operacao };
    } else if (!this.confirmed) this.confirmed = structuredClone(value);
  }
}
export function normalizePlate(value: string): string { return value.toUpperCase().replace(/[\s-]/g, ''); }
