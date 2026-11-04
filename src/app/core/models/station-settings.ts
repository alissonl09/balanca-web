import { ContextoEstacao } from './station';

export type SettingsSection = 'general' | 'vehicles' | 'printing' | 'indicators';
export interface IndicatorModel {
  id: string; name: string; active: boolean; serial: boolean; tcp: boolean;
  protocols: string[]; baudRates: number[]; dataBits: number[];
  parities: string[]; stopBits: number[]; flowControls: string[];
}
export interface IndicatorInstallation {
  id: string; name: string; modelId: string; active: boolean; communication: 'Serial' | 'TCP/IP';
  com: string; baudRate: number | null; dataBits: number | null; parity: string;
  stopBits: number | null; flowControl: string; protocol: string;
  ip: string; port: number | null; timeout: number; reconnect: number;
}
export interface Paper { size: string; source: string; orientation: 'Retrato' | 'Paisagem'; }
export interface PrintSettings {
  printerId: string; fallbackId: string; paper: Record<string, Paper>;
  copies: number; entry: boolean; exit: boolean; windowsTicket: boolean;
  header: string; footer: string; logo: 'standard' | 'demo';
}
export interface StationSettings {
  general: { sgv: boolean; environment: 'Produção' | 'Homologação' | 'Desenvolvimento'; manual: boolean };
  vehicles: { gates: boolean; entryId: string; exitId: string; lights: boolean; display: boolean;
    message: string; ocr: boolean; address: string; port: number | null; token: string; voice: boolean };
  printing: PrintSettings;
  indicators: IndicatorInstallation[];
}
export function defaultSettings(): StationSettings {
  return {
    general: { sgv: false, environment: 'Homologação', manual: true },
    vehicles: { gates: false, entryId: '', exitId: '', lights: false, display: false, message: 'COOXUPE',
      ocr: false, address: '', port: null, token: '', voice: false },
    printing: { printerId: 'ticket-usb', fallbackId: 'a4-usb', paper: {}, copies: 1,
      entry: true, exit: true, windowsTicket: false, header: '', footer: '', logo: 'standard' },
    indicators: []
  };
}
export function scopeKey(context: ContextoEstacao | null): string {
  return context ? JSON.stringify([context.unidade.id, context.estacao.id]) : 'unassigned-demo';
}
export function validIpv4(value: string): boolean {
  const parts = value.trim().split('.');
  return parts.length === 4 && parts.every(p => /^\d+$/.test(p) && String(Number(p)) === p && Number(p) <= 255);
}
export function sanitizeDisplayText(value: string): string {
  return value.replace(/[Ææ]/g, 'AE').replace(/[Œœ]/g, 'OE').replace(/ß/g, 'SS')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/[\t\r\n]/g, ' ').replace(/[^A-Z0-9 -]/g, '').replace(/\s+/g, ' ').trim();
}
export function validateIndicator(i: IndicatorInstallation, m?: IndicatorModel): string[] {
  const errors: string[] = [];
  if (!i.name.trim()) errors.push('Informe o nome do indicador.');
  if (!m?.active) return [...errors, 'Selecione um modelo ativo.'];
  if (!m.protocols.includes(i.protocol)) errors.push('Protocolo não suportado pelo modelo.');
  if (!Number.isFinite(i.timeout) || i.timeout <= 0 || !Number.isFinite(i.reconnect) || i.reconnect <= 0) errors.push('Timeout e reconexão devem ser positivos.');
  if (i.communication === 'TCP/IP') {
    if (!m.tcp) errors.push('Modelo não suporta TCP/IP.');
    if (!validIpv4(i.ip)) errors.push('IPv4 inválido.');
    if (!Number.isInteger(i.port) || i.port! < 1 || i.port! > 65535) errors.push('Porta deve estar entre 1 e 65535.');
  } else {
    if (!m.serial) errors.push('Modelo não suporta Serial.');
    if (!/^COM[1-9]\d*$/i.test(i.com)) errors.push('Informe a porta COM da estação.');
    if (!m.baudRates.includes(i.baudRate!) || !m.dataBits.includes(i.dataBits!) || !m.parities.includes(i.parity)
      || !m.stopBits.includes(i.stopBits!) || !m.flowControls.includes(i.flowControl)) errors.push('Parâmetros Serial fora das capacidades do modelo.');
  }
  return errors;
}
