import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Configuracoes } from './configuracoes';
import { Pesagem } from '../pesagem/pesagem';
import { StationSettingsService, demoContexts } from '../../core/state/station-settings.service';
import { PermissionService } from '../../core/state/permission.service';
import { IndicatorCatalog } from '../../core/state/indicator-catalog';
import { IndicatorInstallation, sanitizeDisplayText, validateIndicator, validIpv4 } from '../../core/models/station-settings';
import { IndicatorGatewayService, diagnosticResults } from '../../core/integrations/indicator-gateway';
import { PrintGatewayService } from '../../core/integrations/print-gateway';
registerLocaleData(localePt,'pt-BR');

function installation(): IndicatorInstallation {
  return { id:'i1',name:'Indicador entrada',modelId:'IND570',active:true,communication:'Serial',com:'COM3',baudRate:4800,dataBits:7,parity:'Even',stopBits:2,flowControl:'None',protocol:'Demand Output',ip:'192.168.1.10',port:1701,timeout:5000,reconnect:3000 };
}
describe('Configurações compartilhadas por estação', () => {
  let store: StationSettingsService;
  beforeEach(() => {
    TestBed.configureTestingModule({imports:[Configuracoes,Pesagem],providers:[provideHttpClient()]});
    store=TestBed.inject(StationSettingsService);store.select(demoContexts[0]);
  });
  it('isolates settings between stations within the same unit and across units', () => {
    const draft=structuredClone(store.settings());draft.general.sgv=true;store.save('general',draft);
    store.select(demoContexts[1]);expect(store.settings().general.sgv).toBeFalse();
    const other=structuredClone(store.settings());other.general.environment='Produção';store.save('general',other);
    store.select(demoContexts[2]);expect(store.settings().general.environment).toBe('Homologação');
    store.select(demoContexts[0]);expect(store.settings().general.sgv).toBeTrue();expect(store.settings().general.environment).toBe('Homologação');
  });
  it('shows or hides vehicle management according to SGV', () => {
    const fixture=TestBed.createComponent(Configuracoes);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-tab=vehicles]')).toBeNull();
    fixture.componentInstance.draft.general.sgv=true;fixture.componentInstance.save();fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-tab=vehicles]')).toBeTruthy();
    fixture.componentInstance.draft.general.sgv=false;fixture.componentInstance.save();fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-tab=vehicles]')).toBeNull();
  });
  it('disables gate inversion and assignments when gates disabled, swaps values when enabled', () => {
    const fixture=TestBed.createComponent(Configuracoes);fixture.detectChanges();const page=fixture.componentInstance;
    page.draft.general.sgv=true;page.tab='vehicles';fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.swap') as HTMLButtonElement).disabled).toBeTrue();
    page.draft.vehicles.gates=true;page.draft.vehicles.entryId='gate-01';page.draft.vehicles.exitId='gate-02';page.swapGates();
    expect(page.draft.vehicles.entryId).toBe('gate-02');expect(page.draft.vehicles.exitId).toBe('gate-01');
  });
  it('rejects duplicate gate equipment and invalid OCR without publishing draft changes', () => {
    const draft=structuredClone(store.settings());draft.vehicles.gates=true;draft.vehicles.entryId=draft.vehicles.exitId='gate-01';
    expect(()=>store.save('vehicles',draft)).toThrow();expect(store.settings().vehicles.gates).toBeFalse();
    draft.vehicles.exitId='gate-02';draft.vehicles.ocr=true;draft.vehicles.address='camera';draft.vehicles.port=65536;
    expect(()=>store.save('vehicles',draft)).toThrow();draft.vehicles.port=8080;store.save('vehicles',draft);expect(store.settings().vehicles.ocr).toBeTrue();
  });
  it('propagates saved SGV, gates, display and message to Pesagem without restarting', () => {
    const fixture=TestBed.createComponent(Pesagem);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.access')).toBeNull();
    const draft=structuredClone(store.settings());draft.general.sgv=true;store.save('general',draft);
    draft.vehicles={...draft.vehicles,gates:true,lights:true,display:true,message:'COOXUPÉ BALANÇA INFORMAÇÃO',entryId:'gate-01',exitId:'gate-02'};
    store.save('vehicles',draft);fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[role=tab]').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.gate').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.traffic-light').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.access-display').textContent).toBe('COOXUPE BALANCA INFORMACAO');
    draft.vehicles.lights=false;draft.vehicles.display=false;draft.vehicles.gates=false;store.save('vehicles',draft);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.access').textContent).toContain('Nenhum componente visual habilitado.');
    draft.general.sgv=false;store.save('general',draft);fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[role=tab]').length).toBe(1);
    expect(fixture.nativeElement.querySelector('[role=tab]').textContent).toContain('Veículos em Operação');
  });
  it('keeps red above green and associates state with the equipment after inversion', () => {
    const draft=structuredClone(store.settings());draft.general.sgv=true;store.save('general',draft);
    draft.vehicles={...draft.vehicles,gates:true,lights:true,entryId:'gate-01',exitId:'gate-02'};store.save('vehicles',draft);
    const fixture=TestBed.createComponent(Pesagem);fixture.detectChanges();const page=fixture.componentInstance;page.mock.toggleGate('entrada');fixture.detectChanges();
    const sides=()=>fixture.nativeElement.querySelectorAll('.gates>div');
    expect(sides()[0].querySelector('.traffic-light').firstElementChild.classList.contains('red')).toBeTrue();
    expect(sides()[0].querySelector('.green.on')).toBeTruthy();expect(sides()[1].querySelector('.red.on')).toBeTruthy();
    draft.vehicles.entryId='gate-02';draft.vehicles.exitId='gate-01';store.save('vehicles',draft);fixture.detectChanges();
    expect(sides()[0].querySelector('h3').textContent).toBe('Entrada');expect(sides()[0].querySelector('.red.on')).toBeTruthy();expect(sides()[1].querySelector('.green.on')).toBeTruthy();
  });
  it('updates manual availability from settings and never treats zero as disconnection', () => {
    const fixture=TestBed.createComponent(Pesagem);fixture.detectChanges();const page=fixture.componentInstance;
    page.mock.updateReading(0,true,true);const draft=structuredClone(store.settings());draft.general.manual=false;store.save('general',draft);fixture.detectChanges();
    expect(page.can('manual')).toBeFalse();page.mock.updateReading(0,false,false);expect(page.can('manual')).toBeTrue();
    draft.general.manual=true;store.save('general',draft);fixture.detectChanges();page.mock.updateReading(0,true,true);expect(page.can('manual')).toBeTrue();
    TestBed.inject(PermissionService).selectDemoUser('carlos');fixture.detectChanges();expect(page.can('manual')).toBeFalse();
  });
  it('switching stations clears pending capture and does not leak equipment state', () => {
    const fixture=TestBed.createComponent(Pesagem);fixture.detectChanges();const page=fixture.componentInstance;
    page.runAction('manual');expect(page.modal).toBe('auth');store.select(demoContexts[1]);fixture.detectChanges();
    expect(page.modal).toBeNull();expect(page.state.phase).toBe('nova');expect(page.state.captures.length).toBe(0);
  });
  it('uses distinct Serial and TCP fields and validates capabilities without forcing defaults', () => {
    const fixture=TestBed.createComponent(Configuracoes);fixture.detectChanges();const page=fixture.componentInstance;page.tab='indicators';page.draft.indicators=[installation()];fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.serial-fields')).toBeTruthy();expect(fixture.nativeElement.querySelector('.tcp-fields')).toBeNull();
    page.draft.indicators[0].communication='TCP/IP';fixture.detectChanges();expect(fixture.nativeElement.querySelector('.serial-fields')).toBeNull();expect(fixture.nativeElement.querySelector('.tcp-fields')).toBeTruthy();
    const item=page.draft.indicators[0];item.port=65536;expect(()=>store.save('indicators',page.draft)).toThrow();item.port=1701;item.timeout=0;expect(()=>store.save('indicators',page.draft)).toThrow();item.timeout=1000;item.reconnect=-1;expect(()=>store.save('indicators',page.draft)).toThrow();
    item.reconnect=1000;store.save('indicators',page.draft);expect(store.settings().indicators[0].port).toBe(1701);
    item.communication='Serial';item.baudRate=123;expect(validateIndicator(item,page.model('IND570')).length).toBeGreaterThan(0);
  });
  it('accepts open model catalog and rejects duplicate codes', () => {
    const catalog=TestBed.inject(IndicatorCatalog);const model=structuredClone(catalog.models()[0]);model.id='CUSTOM';model.name='Modelo local';catalog.save(model,true);
    expect(catalog.models().some(m=>m.id==='CUSTOM')).toBeTrue();expect(()=>catalog.save(model,true)).toThrow();
    expect(catalog.models().find(m=>m.id==='IND560')?.protocols).toEqual([]);
  });
  it('diagnostic is isolated, cancellable and never changes weighing state', fakeAsync(() => {
    const weighing=TestBed.createComponent(Pesagem);weighing.detectChanges();const first=weighing.componentInstance.reading;
    const gateway=TestBed.inject(IndicatorGatewayService);
    for(const scenario of diagnosticResults){let message='';gateway.test(store.key(),installation(),scenario).subscribe(r=>message=r.message);tick(250);expect(message).toContain(scenario);}
    expect(weighing.componentInstance.reading).toEqual(first);
    const fixture=TestBed.createComponent(Configuracoes);fixture.detectChanges();const page=fixture.componentInstance;
    page.test(installation());expect(page.testing).toBeTrue();page.podeSairDaPagina();tick(250);expect(page.testing).toBeFalse();
  }));
  it('validates IPv4 and central display sanitization', () => {
    expect(validIpv4('256.1.1.1')).toBeFalse();expect(validIpv4('01.1.1.1')).toBeFalse();expect(validIpv4('192.168.1.1')).toBeTrue();
    expect(sanitizeDisplayText('COOXUPÉ BALANÇA INFORMAÇÃO')).toBe('COOXUPE BALANCA INFORMACAO');
    const draft=structuredClone(store.settings());draft.vehicles.display=true;draft.vehicles.message='☃';expect(()=>store.save('vehicles',draft)).toThrow();
  });
  it('keeps paper per printer, validates copies and previews Ticket and A4 with configured header/logo', () => {
    const fixture=TestBed.createComponent(Configuracoes);fixture.detectChanges();const page=fixture.componentInstance;
    page.tab='printing';page.paper('ticket-usb').size='Bobina 58 mm';page.paper('a4-usb').orientation='Paisagem';
    page.draft.printing.header='Cabeçalho configurado';page.draft.printing.footer='Rodapé';page.draft.printing.logo='demo';page.save();
    expect(store.settings().printing.paper['ticket-usb'].size).toBe('Bobina 58 mm');
    page.preview('Ticket');fixture.detectChanges();expect(fixture.nativeElement.querySelector('app-print-preview').textContent).toContain('Cabeçalho configurado');
    page.preview('A4');fixture.detectChanges();expect(fixture.nativeElement.querySelector('article.a4.landscape')).toBeTruthy();
    page.draft.printing.copies=0;expect(()=>store.save('printing',page.draft)).toThrow();
    const gateway=TestBed.inject(PrintGatewayService);const snapshot=gateway.preview(store.key(),store.settings().printing,'Ticket');snapshot.settings.header='Mutated';expect(store.settings().printing.header).toBe('Cabeçalho configurado');
  });
  it('restricts settings by resource and applies profile changes to weighing immediately', () => {
    const auth=TestBed.inject(PermissionService);expect(auth.profiles().map(p=>p.code)).toEqual([0,1,2,3,4]);
    auth.setGrant(4,'useManual',true);auth.selectDemoUser('carlos');expect(auth.can('useManual')).toBeTrue();expect(auth.can('generalSettings')).toBeFalse();
    expect(()=>store.save('general',structuredClone(store.settings()))).toThrow();expect(()=>auth.setGrant(1,'weigh',false)).toThrow();
    auth.selectDemoUser('master');expect(auth.can('manageProfiles')).toBeTrue();expect(()=>auth.setGrant(0,'weigh',false)).toThrow();
    auth.selectDemoUser('alisson');auth.assign('carlos',3);expect(auth.users().find(u=>u.id==='carlos')?.profile).toBe(3);
  });
});

describe('Configurações layout desktop', () => {
  for (const width of [1920,1600,1366]) {
    it(`keeps the main card within content width at ${width}px`, () => {
      TestBed.configureTestingModule({imports:[Configuracoes]});
      const store=TestBed.inject(StationSettingsService);store.select(demoContexts[0]);
      const fixture=TestBed.createComponent(Configuracoes);fixture.nativeElement.style.width=`${width-148}px`;fixture.detectChanges();
      const page=fixture.componentInstance;page.draft.general.sgv=true;page.draft.indicators=[installation()];
      for(const tab of page.tabs){page.tab=tab.id;fixture.detectChanges();const card=fixture.nativeElement.querySelector('.settings-card') as HTMLElement;expect(card.scrollWidth).withContext(tab.id).toBeLessThanOrEqual(card.clientWidth+1);}
    });
  }
});

describe('Importação legada explícita', () => {
  it('copies a legacy indicator into a draft without changing localStorage or another station', () => {
    TestBed.configureTestingModule({imports:[Configuracoes]});
    const key='balanca-configuracao-indicador';const before=localStorage.getItem(key);
    try {
      const legacy={id:'old-i',nome:'Legado',modelo:'alfa-3101-c',ativo:true,comunicacao:{tipo:'SERIAL',portaSerial:'COM9',velocidadeSerial:4800,bitsDados:7,paridade:'EVEN',bitsParada:2,controleFluxo:'NONE'}};
      localStorage.setItem(key,JSON.stringify(legacy));
      const store=TestBed.inject(StationSettingsService);store.select(demoContexts[0]);
      const fixture=TestBed.createComponent(Configuracoes);fixture.detectChanges();const page=fixture.componentInstance;page.importIndicator();
      expect(page.draft.indicators[0].com).toBe('COM9');expect(page.draft.indicators[0].baudRate).toBe(4800);
      expect(store.settings().indicators).toEqual([]);expect(JSON.parse(localStorage.getItem(key)!)).toEqual(legacy);
      store.select(demoContexts[1]);expect(store.settings().indicators).toEqual([]);
    } finally { if(before===null)localStorage.removeItem(key);else localStorage.setItem(key,before); }
  });
});

describe('Sessão de pesagem ao visitar Configurações', () => {
  it('preserves an open weighing when the page is recreated in the same station', () => {
    TestBed.configureTestingModule({imports:[Configuracoes,Pesagem],providers:[provideHttpClient()]});
    const store=TestBed.inject(StationSettingsService);store.select(demoContexts[0]);
    const first=TestBed.createComponent(Pesagem);first.detectChanges();first.componentInstance.state.placa='ZZZ9Z99';
    first.componentInstance.state.confirm(first.componentInstance.state.preview(1200,{peso:1200,data:'now',autorizador:'demo',justificativa:'Teste'}));first.destroy();
    const draft=structuredClone(store.settings());draft.general.manual=false;store.save('general',draft);
    const second=TestBed.createComponent(Pesagem);second.detectChanges();
    expect(second.componentInstance.state.phase).toBe('aberta');expect(second.componentInstance.state.first).toBe(1200);expect(second.componentInstance.placa).toBe('ZZZ9Z99');
    expect(second.componentInstance.state.manualEnabled).toBeFalse();
  });
});
