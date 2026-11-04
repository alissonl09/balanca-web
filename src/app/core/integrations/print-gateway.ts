import { Injectable, InjectionToken, inject } from '@angular/core';
import { Preview } from '../../pages/pesagem/pesagem-state';
import { PrintSettings } from '../models/station-settings';
import { Ticket, ticketFromPreview } from '../models/ticket';

export const mockPrinters = [
  { id: 'ticket-usb', name: 'Ticket USB (simulada)', status: 'Online', type: 'Ticket', connection: 'USB001', sizes: ['Bobina 80 mm','Bobina 58 mm'], sources: ['Bobina'] },
  { id: 'ticket-rede', name: 'Ticket Rede (simulada)', status: 'Offline', type: 'Ticket', connection: 'Rede (mock)', sizes: ['Bobina 80 mm'], sources: ['Bobina'] },
  { id: 'a4-usb', name: 'A4 USB (simulada)', status: 'Online', type: 'A4', connection: 'USB002', sizes: ['A4','Carta'], sources: ['Bandeja 1','Alimentação manual'] },
  { id: 'a4-rede', name: 'A4 Rede (simulada)', status: 'Indisponível', type: 'A4', connection: 'Rede (mock)', sizes: ['A4'], sources: ['Bandeja 1'] }
];
export interface PrintDocument { format: 'Ticket' | 'A4'; settings: PrintSettings; operation: Preview | null; summary?: number[]; ticket?: Ticket; }
export interface PrintGatewayPort { preview(document: PrintDocument): PrintDocument; }
export const PRINT_GATEWAY = new InjectionToken<PrintGatewayPort>('PRINT_GATEWAY', {
  providedIn: 'root', factory: () => ({ preview: value => structuredClone(value) })
});
@Injectable({ providedIn: 'root' })
export class PrintGatewayService {
  private readonly port = inject(PRINT_GATEWAY);
  private readonly operations = new Map<string, Preview>();
  private readonly summaries = new Map<string, number[]>();
  publish(key: string, value: Preview, summary: number[] = []): void { this.operations.set(key, structuredClone(value)); this.summaries.set(key, [...summary]); }
  preview(key: string, settings: PrintSettings, format: 'Ticket' | 'A4'): PrintDocument {
    const operation=this.operations.get(key)??null,summary=this.summaries.get(key)??[];
    return this.port.preview({ format, settings, operation, summary, ticket:ticketFromPreview(operation,summary) });
  }
  previewTicket(ticket:Ticket,settings:PrintSettings,format:'Ticket'|'A4'):PrintDocument {
    return this.port.preview({format,settings,operation:null,ticket});
  }
}
