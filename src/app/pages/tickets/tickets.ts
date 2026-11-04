import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TicketService } from '../../core/state/ticket.service';
import { PermissionService } from '../../core/state/permission.service';
import { StationSettingsService } from '../../core/state/station-settings.service';
import { PesagemState } from '../pesagem/pesagem-state';
import { Ticket } from '../../core/models/ticket';
import { PrintDocument, PrintGatewayService } from '../../core/integrations/print-gateway';
import { PrintPreviewComponent } from '../../shared/components/print-preview';

@Component({selector:'app-tickets',standalone:true,imports:[FormsModule,CommonModule,PrintPreviewComponent],templateUrl:'./tickets.html',styleUrl:'../../shared/styles/workbench.css'})
export class Tickets {
  readonly service=inject(TicketService);readonly auth=inject(PermissionService);readonly settings=inject(StationSettingsService);
  readonly weighing=inject(PesagemState);private readonly print=inject(PrintGatewayService);
  query='';message='';format:'Ticket'|'A4'='Ticket';selected:Ticket|null=null;document:PrintDocument|null=null;
  cancellation:Ticket|null=null;reason='';
  allowed():boolean{return this.auth.can('printTicket')||this.auth.can('reprintTicket')||this.auth.can('cancelTicket');}
  get rows(){const q=this.query.trim().toLowerCase();return this.service.list().filter(t=>`${t.number} ${t.weighingId} ${t.plate} ${t.status}`.toLowerCase().includes(q));}
  open(ticket:Ticket):void{if(!this.allowed())return;this.selected=structuredClone(ticket);this.document=this.print.previewTicket(ticket,this.settings.settings().printing,this.format);}
  changeFormat():void{if(this.selected)this.open(this.selected);}
  emit():void{try{this.open(this.service.emitLocal(this.weighing));this.message='Ticket MOCK emitido somente em memória.';}catch(e){this.message=(e as Error).message;}}
  reprint(ticket:Ticket):void{try{this.open(this.service.reprint(ticket.id));this.message='Reimpressão mock registrada. Nenhuma impressora foi acionada.';}catch(e){this.message=(e as Error).message;}}
  cancel():void{try{if(this.cancellation)this.service.cancel(this.cancellation.id,this.reason);this.cancellation=null;this.reason='';this.message='Ticket cancelado logicamente; dados e histórico preservados.';}catch(e){this.message=(e as Error).message;}}
}
