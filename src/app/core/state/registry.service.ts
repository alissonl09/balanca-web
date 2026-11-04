import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { RegistryKind, RegistryRecord, emptyRecord, registryKinds } from '../models/registry';
import { PermissionService } from './permission.service';

export interface RegistryRepository { list(kind: RegistryKind): RegistryRecord[]; save(kind: RegistryKind, record: RegistryRecord): void; }
export const REGISTRY_REPOSITORY = new InjectionToken<RegistryRepository>('REGISTRY_REPOSITORY', {
  providedIn: 'root', factory: () => {
    const rows:Record<RegistryKind,RegistryRecord[]> = { remetentes:[],transportadoras:[],motoristas:[],placas:[],operacoes:[],itens:[],unidades:[] };
    const add = (kind: RegistryKind, value: Partial<RegistryRecord>) => rows[kind].push({ ...emptyRecord(), code: rows[kind].length + 1, ...value });
    add('remetentes',{name:'Fazenda Boa Vista',personType:'Fornecedor',city:'Guaxupé',uf:'MG'});
    add('remetentes',{name:'Comercial de Café Horizonte',personType:'Cliente',city:'Campinas',uf:'SP'});
    add('transportadoras',{name:'Transportadora Horizonte',city:'Guaxupé',uf:'MG'});
    add('transportadoras',{name:'Cargas Serra Azul',city:'Campinas',uf:'SP'});
    add('transportadoras',{name:'Transportes Vale do Café',city:'Varginha',uf:'MG'});
    add('motoristas',{name:'João da Silva',driverLink:'Autônomo'});
    add('motoristas',{name:'Maria Oliveira',driverLink:'Transportadora',carrierCode:1});
    add('placas',{plate:'ABC1D23',carrierCode:1,vehicleType:'Cavalo'});
    add('placas',{plate:'DEF4G56',carrierCode:2,vehicleType:'Carreta'});
    return {
      list: kind => structuredClone(rows[kind]),
      save: (kind,value) => { const index = rows[kind].findIndex(r => r.code === value.code);
        if (index < 0) rows[kind].push(structuredClone(value)); else rows[kind][index] = structuredClone(value); }
    };
  }
});
@Injectable({ providedIn: 'root' })
export class RegistryService {
  private readonly repository = inject(REGISTRY_REPOSITORY);
  private readonly auth = inject(PermissionService);
  readonly revision = signal(0);
  list(kind: RegistryKind, query = '', includeInactive = false): RegistryRecord[] {
    this.revision();
    if (!this.auth.can('readRegistry')) return [];
    const search = query.toLocaleLowerCase().trim();
    return this.repository.list(kind).filter(r => (includeInactive || r.active) &&
      `${r.code} ${r.name} ${r.plate} ${r.taxId} ${r.city}`.toLocaleLowerCase().includes(search));
  }
  carriers(): RegistryRecord[] { this.revision(); return this.repository.list('transportadoras').filter(r => r.active); }
  carrierName(code: number | null): string { return this.repository.list('transportadoras').find(r => r.code === code)?.name ?? (code == null ? '-' : 'Transportadora indisponível'); }
  save(kind: RegistryKind, draft: RegistryRecord, existingCode: number | null): RegistryRecord {
    if (!this.auth.can(existingCode == null ? 'insertRegistry' : 'editRegistry')) throw new Error('Sem permissão para salvar cadastro.');
    const rows = this.repository.list(kind);
    if (existingCode != null && !rows.some(r => r.code === existingCode)) throw new Error('Registro inexistente.');
    const record = structuredClone(draft);
    record.name = record.name.trim(); record.plate = record.plate.toUpperCase().replace(/[\s-]/g, '');
    if (kind === 'placas') {
      if (!/^[A-Z]{3}\d[A-Z\d]\d{2}$/.test(record.plate)) throw new Error('Informe uma placa válida.');
    } else if (!record.name) throw new Error('Nome / descrição obrigatório.');
    if (kind === 'remetentes' && !['Cliente','Fornecedor'].includes(record.personType)) throw new Error('Selecione o tipo.');
    if (kind === 'motoristas' && !['Autônomo','Transportadora'].includes(record.driverLink)) throw new Error('Selecione o vínculo.');
    if ((kind === 'placas' || (kind === 'motoristas' && record.driverLink === 'Transportadora')) && !this.carriers().some(c => c.code === record.carrierCode)) throw new Error('Selecione uma transportadora cadastrada e ativa.');
    if (kind === 'motoristas' && record.driverLink === 'Autônomo') record.carrierCode = null;
    record.code = existingCode ?? Math.max(0,...rows.map(r => r.code)) + 1;
    this.repository.save(kind, record); this.revision.update(n => n+1); return record;
  }
  deactivate(kind: RegistryKind, code: number): void {
    if (!this.auth.can('deactivateRegistry')) throw new Error('Sem permissão para inativar.');
    const record = this.repository.list(kind).find(r => r.code === code);
    if (!record) throw new Error('Registro inexistente.');
    this.repository.save(kind, { ...record, active: false }); this.revision.update(n => n+1);
  }
}
