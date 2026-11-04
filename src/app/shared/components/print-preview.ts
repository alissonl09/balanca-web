import { Component, Input } from '@angular/core';
import { PrintDocument } from '../../core/integrations/print-gateway';
import { TicketDocumentComponent } from './ticket-document';

@Component({ selector: 'app-print-preview', standalone: true, imports:[TicketDocumentComponent],
  template: `@if (document) {
    <article [class.a4]="document.format === 'A4'" [class.landscape]="orientation === 'Paisagem'" [style.max-width.px]="document.format === 'Ticket' && paperSize.includes('58') ? 232 : null">
      <header><div class="paper-brand">@if (document.settings.logo === 'standard') { <img src="/images/logo-topo.svg" alt="Cooxupé" /> }
      @else { <strong class="demo-logo">LOGO DEMONSTRAÇÃO</strong> }
      @if(document.ticket;as ticket){<div class="paper-ticket-number"><span>Ticket Nº</span><strong>{{ticket.number || '—'}}</strong><small>{{ticket.second != null ? 'FECHAMENTO DE PESO' : 'ABERTURA DE PESO'}}</small></div>}
      @else{<h3>Sistema de Gerenciamento de Pesagens</h3>}</div><p>{{ document.settings.header }}</p></header>
      <h4>{{ document.format }} · PREVIEW LOCAL</h4><p>Sem validade fiscal · sem envio à impressora</p>
      @if(document.ticket){<app-ticket-document [ticket]="document.ticket" />}@else{
      <p>Placa: {{ document.operation?.placa || '-' }} · Carreta: {{ document.operation?.carreta || '-' }}</p>
      <p>Fase: {{ document.operation?.fase ?? 'nova' }} · Peso: {{ document.operation?.peso ?? 0 }} kg</p>
      @if (document.summary?.length) { <p>Pesagem 1: {{ document.summary?.[0] }} kg · Pesagem 2: {{ document.summary?.[1] }} kg</p><p>Líquido: {{ document.summary?.[2] }} kg · Seco: {{ document.summary?.[3] }} kg</p> }
      @for (entry of entries; track entry[0]) { <p><strong>{{ entry[0] }}:</strong> {{ entry[1] || '-' }}</p> }
      <p>Origem: {{ document.operation?.captura?.autorizador ? 'Manual' : 'Indicador/preview' }}</p>
      @if (document.operation?.captura?.autorizador) { <p>Autorizador: {{ document.operation?.captura?.autorizador }} · {{ document.operation?.captura?.justificativa }}</p> }
      <p>Captura: {{ document.operation?.captura?.data || '-' }}</p>}
      <footer>{{ document.settings.footer }}<p>{{ document.settings.copies }} cópia(s) · {{ orientation }}</p></footer>
    </article>
  }`,
  styles: [`article{width:min(100%,320px);margin:12px auto;padding:20px;background:white;border:1px solid #ccd5d1;font:13px/1.3 Arial,sans-serif;overflow-wrap:anywhere;box-sizing:border-box}article.a4{--ticket-columns:2;--ticket-section-font:17px;width:100%;min-height:1018px;padding:40px;font:14px/1.35 Arial}article.landscape{min-height:320px}header,footer{text-align:center}header{border-bottom:1px solid black;padding-bottom:14px;margin-bottom:14px}footer{border-top:1px solid black;padding-top:12px;margin-top:16px;white-space:pre-line}img{width:70px;height:60px;filter:brightness(0)}.paper-brand{display:flex;align-items:flex-start;gap:12px}.paper-brand img{width:62px;height:62px;max-width:62px;max-height:62px;flex:0 0 62px}.paper-ticket-number{flex:1;min-width:0;text-align:right;display:flex;flex-direction:column;gap:4px}.paper-ticket-number span{font-size:13px;font-weight:700}.paper-ticket-number strong{font-size:23px;line-height:1.2;overflow-wrap:anywhere}.paper-ticket-number small{font-size:10px;font-weight:700}article.a4 .paper-brand img{width:90px;height:90px;max-width:90px;max-height:90px;flex-basis:90px}article.a4 .paper-ticket-number strong{font-size:28px}h3{font-size:15px}p{margin:9px 0}.demo-logo{display:block;border:2px solid #00543c;padding:12px}`]
})
export class PrintPreviewComponent {
  @Input() document: PrintDocument | null = null;
  get entries(): [string,string][] { return Object.entries(this.document?.operation?.operacao ?? {}); }
  get orientation(): string {
    if (!this.document) return 'Retrato';
    const id = this.document.format === 'A4' ? this.document.settings.fallbackId : this.document.settings.printerId;
    return this.document.settings.paper[id]?.orientation ?? 'Retrato';
  }
  get paperSize(): string {
    if (!this.document) return '';
    return this.document.settings.paper[this.document.settings.printerId]?.size ?? '';
  }
}
