import type { Preview } from '../../pages/pesagem/pesagem-state';
export interface TicketEvent { at: string; user: string; action: 'Emissão'|'Reimpressão'|'Cancelamento'; justification: string | null; }
/** Identidades distintas; IDs MOCK nunca representam emissão corporativa. */
export interface Ticket {
  id: string; number: string | null; weighingId: string | null; process: string | null;
  documents: string[]; documentType: string | null; plate: string | null; trailer: string | null;
  driver: string | null; carrier: string | null; issuers: string[]; depot: string | null;
  packaging: string | null; invoiceWeight: number | null; first: number | null; second: number | null;
  net: number | null; dry: number | null; operator: string | null; capture: 'Manual'|'Automática'|null;
  authorizer: string | null; justification: string | null; capturedAt: string | null;
  firstAt: string | null; secondAt: string | null; issuedAt: string;
  product: string | null; observation: string | null; unit: string | null;
  status: 'Emitido'|'Cancelado'; cancelledBy: string | null; cancelledAt: string | null;
  cancellationReason: string | null; events: TicketEvent[];
}
const text = (s?: string | null) => s?.trim() || null;
export function numberOrNull(value?: string): number | null {
  if (!value?.trim()) return null;
  let normalized=value.replace(/\s/g,'');
  if(normalized.includes(',')) normalized=normalized.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(normalized)) normalized=normalized.replace(/\./g,'');
  const n=Number(normalized);return Number.isFinite(n)?n:null;
}
export function ticketFromPreview(value: Preview | null, summary: number[] = []): Ticket {
  const op=value?.operacao??{};
  const capture=value?.captura??null;
  const multiple=(s?:string)=>(s??'').split(/[;\n]+/).map(v=>v.trim()).filter(Boolean);
  return { id:'preview',number:null,weighingId:null,process:text(op['Tipo da operação']),documents:multiple(op['Nº Nota(s) / Documento(s)']),documentType:text(op['Tipo do documento']),
    plate:text(value?.placa),trailer:text(value?.carreta),driver:text(op['Motorista']),carrier:text(op['Transportadora']),issuers:multiple(op['Emissor(es)']),depot:text(op['Depósito']),
    packaging:text(op['Embalagem']),invoiceWeight:numberOrNull(op['Peso N.F. (Kg)']),first:summary[0]>0?summary[0]:null,second:summary[1]>0?summary[1]:null,
    net:summary[2]>0?summary[2]:null,dry:summary[3]>0?summary[3]:null,operator:text(op['Operador']),capture:capture?(capture.autorizador?'Manual':'Automática'):null,
    authorizer:text(capture?.autorizador),justification:text(capture?.justificativa),capturedAt:capture?.data??null,firstAt:null,secondAt:null,
    issuedAt:new Date().toISOString(),product:text(op['Item']),observation:text(op['Observação']),unit:null,
    status:'Emitido',cancelledBy:null,cancelledAt:null,cancellationReason:null,events:[] };
}
/** Code 39 do Flutter: delimitadores e zonas de silêncio; somente identificador de preview/mock. */
export function code39(value: string): boolean[] {
  const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
  const patterns=[0x034,0x121,0x061,0x160,0x031,0x130,0x070,0x025,0x124,0x064,0x109,0x049,0x148,0x019,0x118,0x058,0x00d,0x10c,0x04c,0x01c,0x103,0x043,0x112,0x052,0x007,0x106,0x046,0x016,0x181,0x0c1,0x1c0,0x091,0x190,0x0d0,0x085,0x184,0x0c4,0x0a8,0x0a2,0x08a,0x02a];
  if(!value || [...value].some(c=>!alphabet.includes(c))) return [];
  const bars:boolean[]=Array(10).fill(false);const encodings=[0x094,...[...value].map(c=>patterns[alphabet.indexOf(c)]),0x094];
  encodings.forEach((n,index)=>{for(let bit=0;bit<9;bit++)bars.push(...Array(n&(1<<(8-bit))?3:1).fill(bit%2===0));if(index<encodings.length-1)bars.push(false);});
  return [...bars,...Array(10).fill(false)];
}
