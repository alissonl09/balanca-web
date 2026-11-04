import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Ticket, ticketFromPreview } from '../models/ticket';
import { PermissionService } from './permission.service';
import { StationSettingsService } from './station-settings.service';
import { PesagemState } from '../../pages/pesagem/pesagem-state';

export interface TicketRepository { list(scope:string):Ticket[]; save(scope:string,ticket:Ticket):void; }
export const TICKET_REPOSITORY=new InjectionToken<TicketRepository>('TICKET_REPOSITORY',{providedIn:'root',factory:()=>{
  const scopes=new Map<string,Ticket[]>();
  const rows=(scope:string)=>{
    if(!scopes.has(scope)) {
      const base=ticketFromPreview(null);const tickets=[1,2].map(n=>({...base,id:`MOCK-T${n}`,number:`MOCK-T${n}`,weighingId:'MOCK-P1',plate:'ABC1D23',driver:'João da Silva',carrier:'Transportadora Horizonte',documents:['NF-MOCK-01'],documentType:'Nota Fiscal',issuers:['Fazenda Boa Vista'],first:28450,second:n===2?12000:null,issuedAt:'2026-11-03T12:00:00.000Z',events:[{at:'2026-11-03T12:00:00.000Z',user:'fixture',action:'Emissão' as const,justification:null}]}));
      scopes.set(scope,tickets);
    }
    return scopes.get(scope)!;
  };
  return {list:scope=>structuredClone(rows(scope)),save:(scope,ticket)=>{const list=rows(scope),index=list.findIndex(t=>t.id===ticket.id);if(index<0)list.push(structuredClone(ticket));else list[index]=structuredClone(ticket);}};
}});
@Injectable({providedIn:'root'})
export class TicketService {
  private readonly repo=inject(TICKET_REPOSITORY);private readonly auth=inject(PermissionService);private readonly settings=inject(StationSettingsService);
  readonly revision=signal(0);
  list():Ticket[]{this.revision();return this.repo.list(this.settings.key());}
  emitLocal(state:PesagemState):Ticket {
    if(!this.auth.can('printTicket'))throw new Error('Sem permissão para emitir ticket local.');
    if(!state.confirmed?.captura || state.stationKey!==this.settings.key())throw new Error('Confirme uma captura na estação atual antes de emitir um ticket mock.');
    const localId=`MOCK-${crypto.randomUUID().toUpperCase()}`;
    const ticket=ticketFromPreview({...state.confirmed,operacao:state.saved,fase:state.phase},[state.first,state.second,state.net,state.dry]);
    const unit=this.settings.context.contexto()?.unidade;
    Object.assign(ticket,{id:localId,number:`MOCK-${String(this.list().length+1).padStart(6,'0')}`,weighingId:state.localId,unit:unit?`${unit.codigo} - ${unit.descricao}`:null,
      firstAt:state.captures[0]?.data??null,secondAt:state.captures[1]?.data??null});
    ticket.events=[{at:ticket.issuedAt,user:this.auth.current().name,action:'Emissão',justification:null}];
    this.repo.save(this.settings.key(),ticket);this.revision.update(n=>n+1);return ticket;
  }
  cancel(id:string,justification:string):void {
    if(!this.auth.can('cancelTicket'))throw new Error('Sem permissão para cancelar ticket.');
    if(!justification.trim())throw new Error('Justificativa obrigatória.');
    const ticket=this.list().find(t=>t.id===id);if(!ticket || ticket.status==='Cancelado')throw new Error('Ticket inexistente ou já cancelado.');
    const at=new Date().toISOString(),user=this.auth.current().name;
    const next:Ticket={...ticket,status:'Cancelado',cancelledBy:user,cancelledAt:at,cancellationReason:justification.trim(),events:[...ticket.events,{at,user,action:'Cancelamento',justification:justification.trim()}]};
    this.repo.save(this.settings.key(),next);this.revision.update(n=>n+1);
  }
  reprint(id:string):Ticket {
    if(!this.auth.can('reprintTicket'))throw new Error('Sem permissão para reimprimir.');
    const ticket=this.list().find(t=>t.id===id);if(!ticket)throw new Error('Ticket inexistente.');
    const next:Ticket={...ticket,events:[...ticket.events,{at:new Date().toISOString(),user:this.auth.current().name,action:'Reimpressão',justification:null}]};
    this.repo.save(this.settings.key(),next);this.revision.update(n=>n+1);return next;
  }
}
