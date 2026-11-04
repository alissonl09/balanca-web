import { StationSettingsService, demoContexts } from '../../core/state/station-settings.service';
import { PermissionService } from '../../core/state/permission.service';
import { HttpTestingController } from '@angular/common/http/testing';
import { ConfiguracaoGeralService } from '../../services/configuracao-geral.service';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
registerLocaleData(localePt, 'pt-BR');
import { provideHttpClient } from '@angular/common/http';

import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TestBed } from '@angular/core/testing';

import { PreTicketResponse } from '../../models/pre-ticket-response';

import { Pesagem } from './pesagem';

/**
 * Cria uma pré-ticket simulada
 * para os testes.
 */
function criarPreTicket(tipoOperacao: string | null): PreTicketResponse {
  return {
    tipoDocumento: tipoOperacao === null ? 'EPA' : 'XFER',

    tipoOperacao,

    nota: 'Documento de teste',

    emissor: 'Emissor de teste',

    motorista: 'Motorista de teste',

    transportador: 'Transportador de teste',

    quantidadeTotal: 4511,

    codigoEmbalagem: 'BAG',

    deposito: 'Depósito de teste',

    numeroSequencia: 1,

    numeroTicketOrigem: tipoOperacao === 'ENTRADA' ? 0 : null,

    codigoUnidadeOrigem: tipoOperacao === 'ENTRADA' ? 0 : null,

    pesoLiquidoOrigem: tipoOperacao === 'ENTRADA' ? 0 : null,

    codigoRetorno: 'S',

    descricaoRetorno: 'Pré-ticket encontrada com sucesso.',
  };
}

describe('Pesagem', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pesagem],

      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(Pesagem);

    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('should render the title Pesagem', () => {
    const fixture = TestBed.createComponent(Pesagem);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Pesagem');
  });

  it('should display origin data for ENTRADA', () => {
    const fixture = TestBed.createComponent(Pesagem);

    const component = fixture.componentInstance;

    component.preTicket = criarPreTicket('ENTRADA');

    expect(component.exibirDadosOrigem).toBe(true);
  });

  it('should not display origin data for SAIDA', () => {
    const fixture = TestBed.createComponent(Pesagem);

    const component = fixture.componentInstance;

    component.preTicket = criarPreTicket('SAIDA');

    expect(component.exibirDadosOrigem).toBe(false);
  });

  it('should not display origin data for EPA', () => {
    const fixture = TestBed.createComponent(Pesagem);

    const component = fixture.componentInstance;

    component.preTicket = criarPreTicket(null);

    expect(component.exibirDadosOrigem).toBe(false);
  });
});

describe('Pesagem shortcuts', () => {
  it('F6 resets once and F2 does nothing', () => {
    TestBed.configureTestingModule({ imports: [Pesagem], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const component = TestBed.createComponent(Pesagem).componentInstance;
    const reset = spyOn(component, 'novaPesagem');
    component.onShortcut(new KeyboardEvent('keydown', { key: 'F2' }));
    component.onShortcut(new KeyboardEvent('keydown', { key: 'F6', repeat: true }));
    expect(reset).not.toHaveBeenCalled();
    component.onShortcut(new KeyboardEvent('keydown', { key: 'F6' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe('Pesagem functional equivalence', () => {
  let fixture: import('@angular/core/testing').ComponentFixture<Pesagem>;
  let page: Pesagem;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Pesagem], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const store = TestBed.inject(StationSettingsService); store.select(demoContexts[0]);
    const config = structuredClone(store.settings()); config.general.sgv = true; config.general.manual = false;
    config.vehicles = { ...config.vehicles, gates: true, lights: true, display: true, entryId: 'gate-01', exitId: 'gate-02' };
    store.save('general', config); store.save('vehicles', config);
    fixture = TestBed.createComponent(Pesagem); page = fixture.componentInstance; fixture.detectChanges();
  });
  for (const [key, modal] of [['F5','print'],['F11','auth'],['F12','confirm']] as const) {
    it(`${key} and click open the same flow even from an input`, () => {
      const input = fixture.nativeElement.querySelector('#placa') as HTMLInputElement;
      input.focus(); input.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles:true, cancelable:true}));
      expect(page.modal).toBe(modal); page.closeModal(); fixture.detectChanges();
      (fixture.nativeElement.querySelector(`[data-action="${key === 'F5' ? 'imprimir' : key === 'F11' ? 'manual' : 'pesar'}"]`) as HTMLButtonElement).click();
      expect(page.modal).toBe(modal);
    });
  }
  it('F10 is disabled before opening, edits only while open, and disables after closing', () => {
    const action = () => fixture.nativeElement.querySelector('[data-action="salvar"]') as HTMLButtonElement;
    expect(action().disabled).toBeTrue();
    page.onShortcut(new KeyboardEvent('keydown', {key:'F10'})); expect(page.state.saved).toEqual({});
    page.state.confirm(page.state.preview(1000,{peso:1000,data:'now'})); fixture.detectChanges(); expect(action().disabled).toBeFalse();
    page.state.draft['Observação'] = 'Edição'; page.onShortcut(new KeyboardEvent('keydown', {key:'F10'}));
    expect(page.state.saved['Observação']).toBe('Edição'); expect(page.state.first).toBe(1000); expect(page.state.captures.length).toBe(1);
    page.state.confirm(page.state.preview(400,{peso:400,data:'now'})); fixture.detectChanges(); expect(action().disabled).toBeTrue();
  });
  it('F6 clears weights and operation but preserves mock settings and indicator reading', () => {
    page.mock.updateReading(32000,true,true); page.state.manualEnabled = true;
    page.state.draft['Motorista'] = 'Anterior'; page.state.confirm(page.state.preview(100,{peso:100,data:'now'}));
    page.onShortcut(new KeyboardEvent('keydown', {key:'F6'}));
    expect(page.state.phase).toBe('nova'); expect(page.state.first).toBe(0); expect(page.state.draft['Motorista']).toBeUndefined();
    expect(page.state.manualEnabled).toBeTrue(); expect(page.reading.peso).toBe(32000);
  });
  it('requires manual authorization then positive weight and confirmation; cancel captures nothing', () => {
    page.runAction('manual'); page.user='demo';page.password='demo'; page.justification=''; page.authorize(); expect(page.modal).toBe('auth');
    page.justification='Indicador em manutenção';page.authorize();expect(page.modal).toBe('weight');
    page.manualWeight=0;page.enterManualWeight();expect(page.modal).toBe('weight');
    page.manualWeight=1000;page.enterManualWeight();expect(page.modal).toBe('confirm');expect(page.state.first).toBe(0);
    page.closeModal();expect(page.state.captures.length).toBe(0);
    page.runAction('manual');page.user='demo';page.password='demo';page.justification='Contingência';page.authorize();page.manualWeight=1000;page.enterManualWeight();page.confirm();
    expect(page.state.phase).toBe('aberta');expect(page.state.captures[0].justificativa).toBe('Contingência');
    fixture.detectChanges();expect(fixture.nativeElement.querySelector('.summary-grid').textContent).toContain('1.000');
  });
  it('zero connected is not disconnected and permissions are rechecked on confirmation', () => {
    page.mock.updateReading(0,true,true);expect(page.can('manual')).toBeFalse();
    page.state.manualEnabled=true;expect(page.can('manual')).toBeTrue();page.runAction('manual');
    page.user='demo';page.password='demo';page.justification='Teste';page.authorize();page.manualWeight=10;page.enterManualWeight();
    TestBed.inject(PermissionService).setGrant(2,'authorizeManual',false);page.confirm();expect(page.state.phase).toBe('nova');expect(page.modalError).toContain('Permissão');
  });
  it('automatic mock reading confirms opening and closing; disconnected preview leaves capture intact', () => {
    page.mock.updateReading(1000,true,true);page.runAction('pesar');page.confirm();expect(page.state.first).toBe(1000);
    page.mock.updateReading(0,false,false);page.runAction('pesar');page.confirm();expect(page.state.phase).toBe('aberta');expect(page.state.captures.length).toBe(1);
    page.mock.updateReading(400,true,true);page.runAction('pesar');page.confirm();expect(page.state.phase).toBe('fechada');expect(page.state.second).toBe(400);
  });
  it('single integrated trailer is readonly, multiple trailers use LOV and missing integration stays editable', () => {
    page.placa='ghi-3f45';page.consultarPreTicket();fixture.detectChanges();expect(page.state.carreta).toBe('JKL6M78');
    expect((fixture.nativeElement.querySelector('#placa-carreta') as HTMLInputElement).readOnly).toBeTrue();
    expect(page.readonlyField('Motorista')).toBeTrue();expect(page.readonlyField('Item')).toBeFalse();
    page.limparConsulta();page.placa='ABC1D23';page.consultarPreTicket();fixture.detectChanges();expect(fixture.nativeElement.querySelector('select option[value="XYZ9H87"]')).toBeTruthy();
    page.limparConsulta();page.placa='ZZZ9Z99';page.consultarPreTicket();fixture.detectChanges();expect(page.readonlyField('Motorista')).toBeFalse();expect((fixture.nativeElement.querySelector('#placa-carreta') as HTMLInputElement).readOnly).toBeFalse();
  });
  it('Enter consults and clearing enables another cycle', () => {
    page.placa='DEF2E34';const input=fixture.nativeElement.querySelector('#placa'); input.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}));
    expect(page.state.phase).toBe('aberta');expect(page.state.first).toBe(28450);page.limparConsulta();expect(page.state.consulted).toBeFalse();expect(page.state.first).toBe(0);
  });
  it('filters vehicles, counts results and shows optional trailer dash, with SGV tabs', () => {
    expect(page.vehicles.length).toBe(2);page.vehicleTab='operacao';page.search='ABC1D23';expect(page.vehicles.length).toBe(2);
    page.mock.sgv=false;page.vehicleTab='patio';fixture.detectChanges();expect(fixture.nativeElement.querySelectorAll('[role=tab]').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.vehicle-list').textContent).toContain('-');
  });
  it('gate inversion preserves visual position and sanitizes digital display', () => {
    page.mock.toggleGate('entrada');
    const store = TestBed.inject(StationSettingsService); const config = structuredClone(store.settings());
    config.vehicles.entryId = 'gate-02'; config.vehicles.exitId = 'gate-01'; config.vehicles.message = 'COOXUP\u00c9 BALAN\u00c7A';
    store.save('vehicles',config); fixture.detectChanges();
    const columns=fixture.nativeElement.querySelectorAll('.gates>div');expect(columns[0].querySelector('h3').textContent).toBe('Entrada');
    expect(columns[1].querySelector('.gate').classList.contains('open')).toBeTrue();expect(columns[0].querySelector('.red').classList.contains('on')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.access-display').textContent).toBe('COOXUPE BALANCA');
  });
  it('modal blocks duplicate shortcuts and Escape cancels without capture', () => {
    page.runAction('pesar');page.onShortcut(new KeyboardEvent('keydown',{key:'F6'}));expect(page.modal).toBe('confirm');
    page.onShortcut(new KeyboardEvent('keydown',{key:'Escape'}));expect(page.modal).toBeNull();expect(page.state.captures.length).toBe(0);
  });
});

describe('Pesagem real pre-ticket adapter', () => {
  it('keeps GET pre-tickets with unit and plate and never falls back silently to mock', () => {
    TestBed.configureTestingModule({ imports: [Pesagem], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture=TestBed.createComponent(Pesagem);const page=fixture.componentInstance;
    const config=TestBed.inject(ConfiguracaoGeralService); spyOn(config,'obterCodigoUnidadeBalanca').and.returnValue(42);
    const http=TestBed.inject(HttpTestingController);page.mode='real';page.placa='ABC1D23';page.consultarPreTicket();
    const request=http.expectOne(r=>r.url.endsWith('/api/v1/pre-tickets'));
    expect(request.request.method).toBe('GET');expect(request.request.params.get('cdUnidadeBalanca')).toBe('42');expect(request.request.params.get('placa')).toBe('ABC1D23');
    request.flush({descricaoRetorno:'Não encontrada'}, {status:404,statusText:'Not Found'});
    expect(page.state.consulted).toBeFalse();expect(page.state.draft['Motorista']).toBeUndefined();expect(page.mensagem).toContain('Não encontrada');http.verify();
  });
  it('preserves integrated official data, optional trailers and transfer origin', () => {
    TestBed.configureTestingModule({ imports: [Pesagem], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture=TestBed.createComponent(Pesagem);const page=fixture.componentInstance;
    spyOn(TestBed.inject(ConfiguracaoGeralService),'obterCodigoUnidadeBalanca').and.returnValue(42);
    const http=TestBed.inject(HttpTestingController);page.mode='real';page.placa='DEF2E34';page.consultarPreTicket();
    http.expectOne(r=>r.url.endsWith('/api/v1/pre-tickets')).flush({...criarPreTicket('ENTRADA'),placasCarretas:['xyz9h87']});
    expect(page.state.consulted).toBeTrue();expect(page.state.carreta).toBe('XYZ9H87');expect(page.exibirDadosOrigem).toBeTrue();
    expect(page.state.official['Motorista']).toBe('Motorista de teste');http.verify();
  });
  it('cancels an outstanding lookup on New Weighing', () => {
    TestBed.configureTestingModule({ imports: [Pesagem], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const page=TestBed.createComponent(Pesagem).componentInstance;
    spyOn(TestBed.inject(ConfiguracaoGeralService),'obterCodigoUnidadeBalanca').and.returnValue(42);
    const http=TestBed.inject(HttpTestingController);page.mode='real';page.placa='ABC1D23';page.consultarPreTicket();
    const request=http.expectOne(r=>r.url.endsWith('/api/v1/pre-tickets'));page.novaPesagem();
    expect(request.cancelled).toBeTrue();expect(page.state.consulted).toBeFalse();expect(page.carregando).toBeFalse();http.verify();
  });
});
