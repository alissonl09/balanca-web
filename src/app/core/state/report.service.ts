import { Injectable, InjectionToken, inject } from '@angular/core';
import { FilterKey, ReportFilters, ReportRow, reportCatalog } from '../models/reports';
import { RegistryKind } from '../models/registry';
import { REGISTRY_REPOSITORY } from './registry.service';
import { PermissionService } from './permission.service';
import { TicketService } from './ticket.service';
import { PesagemState } from '../../pages/pesagem/pesagem-state';
import { StationSettingsService } from './station-settings.service';

export interface ReportDataPort { weighings(scope:string):ReportRow[]; }
export const REPORT_DATA=new InjectionToken<ReportDataPort>('REPORT_DATA',{providedIn:'root',factory:()=>({weighings:()=>[
  {weighingNumber:'MOCK-P1',date:'2026-11-03',plate:'ABC1D23',trailer:'',driver:'João da Silva',carrier:'Transportadora Horizonte',party:'Fazenda Boa Vista',product:'Café (mock)',unit:'4 - JAPY (mock)',operation:'Recebimento (mock)',documentType:'Nota Fiscal',status:'Fechada',manual:'Sim',divergence:'Não',operator:'Operador mock',first:'28450',second:'12000'},
  {weighingNumber:'MOCK-P2',date:'2026-11-02',plate:'DEF2E34',trailer:'GHI5J67',driver:'Maria Oliveira',carrier:'Cargas Serra Azul',party:'Comercial de Café Horizonte',product:'Café (mock)',unit:'1 - MATRIZ (mock)',operation:'Saída (mock)',documentType:'XFER',status:'Aberta',manual:'Não',divergence:'Sim',operator:'Operador mock',first:'12000',second:''}
]})});
@Injectable({providedIn:'root'})
export class ReportService {
  private readonly data=inject(REPORT_DATA);private readonly registry=inject(REGISTRY_REPOSITORY);private readonly tickets=inject(TicketService);
  private readonly auth=inject(PermissionService);private readonly weighing=inject(PesagemState);private readonly settings=inject(StationSettingsService);
  selected='pesagens';
  private readonly scopes=new Map<string,{drafts:Record<string,ReportFilters>;results:Record<string,ReportRow[]>}>();
  private scope(){const key=this.settings.key();if(!this.scopes.has(key))this.scopes.set(key,{drafts:{},results:{}});return this.scopes.get(key)!;}
  get drafts(){return this.scope().drafts;}
  get results(){return this.scope().results;}
  generate(id:string,filters:ReportFilters):ReportRow[]{
    if(!this.auth.can('readReports'))throw new Error('Sem permissão para relatórios.');
    const definition=reportCatalog.find(r=>r.id===id);if(!definition)throw new Error('Relatório desconhecido.');
    if(filters.startDate&&filters.endDate&&filters.startDate>filters.endDate)throw new Error('Data inicial posterior à data final.');
    const rows=this.source(id).filter(row=>definition.filters.every(key=>{
      const value=filters[key]?.trim().toLocaleLowerCase();if(!value)return true;
      if(key==='startDate')return !!row['date']&&row['date']>=value;
      if(key==='endDate')return !!row['date']&&row['date']<=value;
      if(['status','manual','divergence'].includes(key))return row[key]?.toLocaleLowerCase()===value;
      return (row[key]??'').toLocaleLowerCase().includes(value);
    }));
    this.results[id]=structuredClone(rows);return this.results[id];
  }
  private source(id:string):ReportRow[]{
    if(id==='pesagens'){
      const rows=this.data.weighings(this.settings.key());const state=this.weighing;
      if(state.first>0&&state.stationKey===this.settings.key())rows.push({weighingNumber:state.localId,date:state.captures[0]?.data.slice(0,10)??'',plate:state.placa,trailer:state.carreta,driver:state.saved['Motorista']??'',carrier:state.saved['Transportadora']??'',party:'',product:state.saved['Item']??'',unit:this.settings.context.contexto()?.unidade.descricao??'',operation:'',documentType:state.saved['Tipo do documento']??'',status:state.phase==='aberta'?'Aberta':'Fechada',manual:state.captures.some(c=>c.autorizador)?'Sim':'Não',divergence:'',operator:state.saved['Operador']??'',first:String(state.first),second:state.second>0?String(state.second):''});
      return rows;
    }
    if(id==='tickets')return this.tickets.list().map(t=>({ticketNumber:t.number??'',weighingNumber:t.weighingId??'',plate:t.plate??'',date:t.issuedAt.slice(0,10),ticketType:t.second==null?'Entrada':'Saída',document:t.documents.join('; '),issuer:t.issuers.join('; '),status:t.status}));
    if(id==='depositos')return [{name:'Depósito de demonstração',unit:'4 - JAPY (mock)',status:'Ativo'}];
    const keys:Record<string,FilterKey>={itens:'product',remetentes:'party',transportadoras:'carrier',motoristas:'driver',unidades:'unit',operacoes:'operation'};
    // A permissão de consultar relatórios é independente do CRUD de cadastros.
    return this.registry.list(id as RegistryKind).map(r=>({code:String(r.code),[keys[id]]:r.name,status:r.active?'Ativo':'Inativo'}));
  }
  csv(rows:ReportRow[]):string{
    if(!this.auth.can('exportReports'))throw new Error('Sem permissão para exportar.');
    const columns=[...new Set(rows.flatMap(r=>Object.keys(r)))];
    const escape=(v:string)=>'"'+(/^[=+\-@]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';
    return [columns.map(escape).join(';'),...rows.map(r=>columns.map(c=>escape(r[c]??'')).join(';'))].join('\r\n');
  }
}
