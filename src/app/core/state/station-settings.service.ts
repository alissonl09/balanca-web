import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { StationSettings, SettingsSection, defaultSettings, scopeKey, validateIndicator, sanitizeDisplayText } from '../models/station-settings';
import { ContextoEstacao } from '../models/station';
import { StationContext } from './station-context';
import { Permission, PermissionService } from './permission.service';
import { IndicatorCatalog } from './indicator-catalog';
import { mockPrinters } from '../integrations/print-gateway';

export interface SettingsRepository { load(key: string): StationSettings | null; save(key: string, settings: StationSettings): void; }
export const SETTINGS_REPOSITORY = new InjectionToken<SettingsRepository>('SETTINGS_REPOSITORY', {
  providedIn: 'root', factory: () => {
    const memory = new Map<string, StationSettings>();
    return { load: key => structuredClone(memory.get(key) ?? null), save: (key, value) => { memory.set(key, structuredClone(value)); } };
  }
});
export const sectionPermission: Record<SettingsSection, Permission> = {
  general: 'generalSettings', vehicles: 'vehicleSettings', printing: 'printSettings', indicators: 'indicators'
};
/** Mock de diretório; IDs próprios, duas estações na mesma unidade. */
export const demoContexts: ContextoEstacao[] = [
  { unidade: { id: 'demo-japy', codigo: 4, descricao: 'JAPY' }, estacao: { id: 'demo-japy-1', unidadeId: 'demo-japy', codigo: '01', descricao: 'Estação 01 (mock)', ativo: true } },
  { unidade: { id: 'demo-japy', codigo: 4, descricao: 'JAPY' }, estacao: { id: 'demo-japy-2', unidadeId: 'demo-japy', codigo: '02', descricao: 'Estação 02 (mock)', ativo: true } },
  { unidade: { id: 'demo-matriz', codigo: 1, descricao: 'MATRIZ' }, estacao: { id: 'demo-matriz-1', unidadeId: 'demo-matriz', codigo: '01', descricao: 'Estação 01 (mock)', ativo: true } },
  { unidade: { id: 'demo-armazem', codigo: 7, descricao: 'ARMAZÉM' }, estacao: { id: 'demo-armazem-1', unidadeId: 'demo-armazem', codigo: '01', descricao: 'Estação 01 (mock)', ativo: true } }
];
export const gateOptions = [ { id: 'gate-01', name: 'Cancela 01' }, { id: 'gate-02', name: 'Cancela 02' }, { id: 'gate-03', name: 'Cancela Pátio' } ];
/** Diretório substituível por adapter corporativo; sem contrato HTTP presumido. */
export const STATION_DIRECTORY = new InjectionToken<readonly ContextoEstacao[]>('STATION_DIRECTORY', {
  providedIn: 'root', factory: () => demoContexts
});
@Injectable({ providedIn: 'root' })
export class StationSettingsService {
  readonly context = inject(StationContext);
  private readonly repository = inject(SETTINGS_REPOSITORY);
  private readonly permissions = inject(PermissionService);
  private readonly catalog = inject(IndicatorCatalog);
  private readonly revision = signal(0);
  readonly key = computed(() => scopeKey(this.context.contexto()));
  readonly settings = computed(() => { this.revision(); return this.repository.load(this.key()) ?? defaultSettings(); });
  select(context: ContextoEstacao): void {
    if (!this.permissions.can('generalSettings')) throw new Error('Sem permissão para selecionar estação.');
    this.context.selecionar(context);
  }
  save(section: SettingsSection, draft: StationSettings): void {
    if (!this.context.contexto()) throw new Error('Selecione unidade e estação.');
    if (!this.permissions.can(sectionPermission[section])) throw new Error('Sem permissão para salvar esta seção.');
    const next = structuredClone(this.settings());
    Object.assign(next, { [section]: structuredClone(draft[section]) });
    if (section === 'vehicles') {
      const v = next.vehicles;
      if (v.entryId && v.entryId === v.exitId) throw new Error('Entrada e Saída devem usar cancelas diferentes.');
      if ([v.entryId,v.exitId].some(id => id && !gateOptions.some(e => e.id === id))) throw new Error('Cancela inválida.');
      if (v.display && !sanitizeDisplayText(v.message)) throw new Error('Mensagem do display obrigatória.');
      v.message = v.message.slice(0,40);
      if (v.ocr && (!v.address.trim() || !Number.isInteger(v.port) || v.port! < 1 || v.port! > 65535)) throw new Error('Endereço e porta OCR válidos são obrigatórios.');
    }
    if (section === 'printing') {
      const printing = next.printing;
      if (!Number.isInteger(printing.copies) || printing.copies < 1 || printing.copies > 10) throw new Error('Cópias: informe 1 a 10.');
      if (!mockPrinters.some(p => p.id === printing.printerId) || !mockPrinters.some(p => p.id === printing.fallbackId && p.type === 'A4')) throw new Error('Impressora/fallback inválido.');
      for (const [id,paper] of Object.entries(printing.paper)) {
        const printer = mockPrinters.find(p => p.id === id);
        if (!printer || !printer.sizes.includes(paper.size) || !printer.sources.includes(paper.source) || !['Retrato','Paisagem'].includes(paper.orientation)) throw new Error('Papel/origem/orientação inválidos para a impressora.');
      }
    }
    if (section === 'indicators') {
      if (new Set(next.indicators.map(i => i.id)).size !== next.indicators.length) throw new Error('ID de indicador duplicado.');
      const errors = next.indicators.filter(i => i.active).flatMap(i => validateIndicator(i, this.catalog.models().find(m => m.id === i.modelId)));
      if (errors.length) throw new Error(errors.join(' '));
    }
    this.repository.save(this.key(), next); this.revision.update(n => n + 1);
  }
}
