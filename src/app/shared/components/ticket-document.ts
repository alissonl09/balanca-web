import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ticket, code39 } from '../../core/models/ticket';
@Component({selector:'app-ticket-document',standalone:true,imports:[CommonModule],template:`
@if(ticket;as t){
  <h4>Dados da Operação</h4>
  <p>{{t.id==='preview'?'PRÉVIA SEM EMISSÃO':t.status}} · MOCK / SEM VALIDADE FISCAL</p>
  @if(t.status==='Cancelado'){<div class="cancelled">CANCELADO<p>{{t.cancelledBy}} · {{t.cancelledAt | date:'dd/MM/yyyy HH:mm'}}</p><p>{{t.cancellationReason}}</p></div>}
  <div class="ticket-fields">@for(row of details;track row[0]){@if(row[1]!=null){<p class="ticket-field"><strong>{{row[0]}}</strong><span>{{row[1]}}</span></p>}}</div>
  <h4 class="weights-heading">Dados da Pesagem</h4><table><thead><tr><th>Pesagem</th><th>Peso (kg)</th><th>Captura</th></tr></thead><tbody><tr><td>Pesagem 1</td><td>{{t.first == null ? '—' : (t.first | number:'1.0-3':'pt-BR')}}</td><td>{{(t.firstAt | date:'dd/MM/yyyy HH:mm') || '—'}}</td></tr><tr><td>Pesagem 2</td><td>{{t.second == null ? '—' : (t.second | number:'1.0-3':'pt-BR')}}</td><td>{{(t.secondAt | date:'dd/MM/yyyy HH:mm') || '—'}}</td></tr><tr><td>Peso Líquido</td><td colspan="2">{{t.net == null ? '—' : (t.net | number:'1.0-3':'pt-BR')}}</td></tr><tr><td>Peso Seco</td><td colspan="2">{{t.dry == null ? '—' : (t.dry | number:'1.0-3':'pt-BR')}}</td></tr></tbody></table>
  <p class="issued-at">Emissão da prévia: {{t.issuedAt | date:'dd/MM/yyyy HH:mm:ss'}}</p>
  @if(bars.length){<svg [attr.viewBox]="'0 0 '+bars.length+' 50'" role="img" [attr.aria-label]="'Code 39 '+t.number" preserveAspectRatio="none">@for(bar of bars;track $index){@if(bar){<rect [attr.x]="$index" y="0" width="1" height="45" fill="black" />}}</svg><p class="trace">{{t.number}}</p>}
}`,styles:[`.ticket-fields{display:grid;grid-template-columns:repeat(var(--ticket-columns,1),minmax(0,1fr));column-gap:24px}table{width:100%;border-collapse:collapse;font:inherit}th,td{padding:7px 2px;text-align:left;border-bottom:1px dashed #777}.cancelled{border:2px solid #a52d2d;color:#a52d2d;padding:8px;font-weight:bold}svg{width:100%;height:50px;margin-top:10px;background:white}.trace{text-align:center;font-size:10px;overflow-wrap:anywhere}p{white-space:pre-line;overflow-wrap:anywhere}.ticket-number{font-size:23px;text-align:right;margin:0 0 7px}.ticket-field{margin:0 0 9px}.ticket-field strong{display:block;font-size:11px;margin-bottom:2px}.ticket-field span{display:block}table{margin:18px 0;border-top:1px solid black}th{font-size:11px}h4{font-size:var(--ticket-section-font,15px);margin:12px 0}.weights-heading{border-top:1px solid black;padding-top:18px}.issued-at{font-size:11px}`]})
export class TicketDocumentComponent {
  @Input() ticket:Ticket|null=null;
  get bars():boolean[]{return this.ticket?.number?code39(this.ticket.number):[];}
  get details():[string,string|number|null][] {
    const t=this.ticket;if(!t)return [];
    return [['Pesagem',t.weighingId],['Unidade',t.unit],['Processo',t.process],['Documentos',t.documents.join('; ')||null],['Tipo do documento',t.documentType],
      ['Placa Cavalo',t.plate],['Carreta',t.trailer],['Motorista',t.driver],['Transportadora',t.carrier],['Emissor(es)',t.issuers.join('; ')||null],['Depósito',t.depot],['Item / Produto',t.product],['Embalagem',t.packaging],['Peso N.F. (kg)',t.invoiceWeight],['Operador',t.operator],['Captura',t.capture],['Autorizador',t.authorizer],['Justificativa',t.justification],['Observação',t.observation]];
  }
}
