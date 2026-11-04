import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { RegistryService } from './registry.service';
import { emptyRecord } from '../models/registry';
import { PermissionService } from './permission.service';
import { TicketService } from './ticket.service';
import { ReportService } from './report.service';
import { ticketFromPreview, numberOrNull, code39 } from '../models/ticket';
import { PesagemState } from '../../pages/pesagem/pesagem-state';
import { Pesagem } from '../../pages/pesagem/pesagem';
import { StationSettingsService, demoContexts } from './station-settings.service';
import { Cadastros } from '../../pages/cadastros/cadastros';
import { Relatorios } from '../../pages/relatorios/relatorios';
import { Tickets } from '../../pages/tickets/tickets';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
registerLocaleData(localePt,'pt-BR');

describe('Cadastros, relatórios e tickets locais',()=>{
  beforeEach(()=>TestBed.configureTestingModule({imports:[Cadastros,Relatorios,Tickets],providers:[provideHttpClient()]}));
  it('validates required fields, preserves codes on edit and does not reserve cancelled drafts',()=>{
    const service=TestBed.inject(RegistryService);expect(()=>service.save('transportadoras',emptyRecord(),null)).toThrow();
    const before=service.list('transportadoras').length;
    const page=TestBed.createComponent(Cadastros).componentInstance;page.kind='transportadoras';page.open();page.draft=null;
    const row=service.save('transportadoras',{...emptyRecord(),name:'Nova Transportadora'},null);expect(row.code).toBe(before+1);
    service.save('transportadoras',{...row,name:'Corrigida'},row.code);expect(service.list('transportadoras','Corrigida').length).toBe(1);
    service.deactivate('transportadoras',row.code);expect(service.list('transportadoras','Corrigida')).toEqual([]);expect(service.list('transportadoras','Corrigida',true)[0].active).toBeFalse();
  });
  it('validates driver link and carrier without requiring a trailer in a tractor record',()=>{
    const service=TestBed.inject(RegistryService);
    expect(()=>service.save('motoristas',{...emptyRecord(),name:'Motorista'},null)).toThrow();
    expect(()=>service.save('motoristas',{...emptyRecord(),name:'Motorista',driverLink:'Transportadora'},null)).toThrow();
    const driver=service.save('motoristas',{...emptyRecord(),name:'Autônomo',driverLink:'Autônomo',taxId:'Documento local'},null);expect(driver.carrierCode).toBeNull();
    const tractor=service.save('placas',{...emptyRecord(),plate:'abc-1d23',carrierCode:1},null);expect(tractor.plate).toBe('ABC1D23');expect(tractor.vehicleType).toBe('Cavalo');
    expect(()=>service.save('placas',{...emptyRecord(),plate:'invalid',carrierCode:1},null)).toThrow();
  });
  it('has all seven registry tabs and view does not mutate stored records',()=>{
    const fixture=TestBed.createComponent(Cadastros);fixture.detectChanges();const page=fixture.componentInstance;
    expect(fixture.nativeElement.querySelectorAll('nav button').length).toBe(7);page.open(page.rows[0],true);fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('input[readonly]').length).toBeGreaterThan(0);page.draft!.name='Transient';page.draft=null;expect(page.rows[0].name).not.toBe('Transient');
    for(const kind of ['operacoes','itens','unidades'] as const){page.select(kind);page.open();page.draft!.name='Descrição mock';page.save();expect(page.rows.length).toBe(1);}
  });
  it('enforces registry permissions in the service and component',()=>{
    const auth=TestBed.inject(PermissionService);auth.selectDemoUser('carlos');const service=TestBed.inject(RegistryService);
    expect(service.list('transportadoras')).toEqual([]);expect(()=>service.save('transportadoras',{...emptyRecord(),name:'Denied'},null)).toThrow();
    const fixture=TestBed.createComponent(Cadastros);fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
  });
  it('keeps nullable ticket fields and does not infer net/dry or automatic capture without a reading',()=>{
    const ticket=ticketFromPreview(null);expect(ticket.number).toBeNull();expect(ticket.first).toBeNull();expect(ticket.capture).toBeNull();expect(ticket.net).toBeNull();
    expect(numberOrNull('28.450,5')).toBe(28450.5);expect(numberOrNull('')).toBeNull();
    const bars=code39('MOCK-T1');expect(bars.length).toBeGreaterThan(50);expect(bars.slice(0,10).every(v=>!v)).toBeTrue();expect(bars.slice(-10).every(v=>!v)).toBeTrue();expect(code39('☃')).toEqual([]);
  });
  it('preserves ticket history and original data on cancellation and reprint',()=>{
    const service=TestBed.inject(TicketService);const original=service.list()[0];expect(()=>service.cancel(original.id,'')).toThrow();
    service.cancel(original.id,'Duplicidade no mock');const cancelled=service.list().find(t=>t.id===original.id)!;
    expect(cancelled.status).toBe('Cancelado');expect(cancelled.cancelledBy).toBe('Alisson Romano');expect(cancelled.cancellationReason).toBe('Duplicidade no mock');expect(cancelled.documents).toEqual(original.documents);expect(cancelled.events.length).toBe(2);
    const reprinted=service.reprint(original.id);expect(reprinted.status).toBe('Cancelado');expect(reprinted.events.length).toBe(3);expect(service.list().length).toBe(2);expect(()=>service.cancel(original.id,'Again')).toThrow();
  });
  it('emits multiple explicitly mock tickets for a single confirmed local weighing',()=>{
    const store=TestBed.inject(StationSettingsService);store.select(demoContexts[0]);const state=TestBed.inject(PesagemState);state.stationKey=store.key();state.placa='ZZZ9Z99';state.draft={Motorista:'Pessoa',Transportadora:'Empresa'};
    state.confirm(state.preview(100,{peso:100,data:'2026-11-03T14:00:00Z',autorizador:'demo',justificativa:'Contingência'}));
    const service=TestBed.inject(TicketService),a=service.emitLocal(state),b=service.emitLocal(state);expect(a.id).not.toBe(b.id);expect(a.weighingId).toBe(b.weighingId);expect(a.authorizer).toBe('demo');expect(a.second).toBeNull();
    store.select(demoContexts[1]);expect(service.list().some(t=>t.id===a.id)).toBeFalse();expect(()=>service.emitLocal(state)).toThrow();
  });
  it('applies ticket permissions and renders cancelled watermark in both previews',()=>{
    const fixture=TestBed.createComponent(Tickets);fixture.detectChanges();const page=fixture.componentInstance;page.service.cancel(page.rows[0].id,'Motivo');page.open(page.rows[0]);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cancelled').textContent).toContain('CANCELADO');page.format='A4';page.changeFormat();fixture.detectChanges();expect(fixture.nativeElement.querySelector('article.a4')).toBeTruthy();
    const auth=TestBed.inject(PermissionService);auth.selectDemoUser('carlos');expect(()=>page.service.cancel(page.rows[1].id,'Denied')).toThrow();expect(page.service.reprint(page.rows[0].id).status).toBe('Cancelado');
  });
  it('filters weighings by date, plate, carrier, manual and divergence independently of ticket identities',()=>{
    const service=TestBed.inject(ReportService);expect(service.generate('pesagens',{startDate:'2026-11-03',endDate:'2026-11-03',plate:'ABC1D23',carrier:'Horizonte',manual:'Sim',divergence:'Não'}).length).toBe(1);
    expect(service.generate('pesagens',{trailer:'GHI5J67',manual:'Não'}).length).toBe(1);expect(service.generate('pesagens',{driver:'nobody'})).toEqual([]);
    expect(()=>service.generate('pesagens',{startDate:'2026-11-04',endDate:'2026-11-03'})).toThrow();
    const tickets=service.generate('tickets',{weighingNumber:'MOCK-P1'});expect(tickets.length).toBe(2);expect(new Set(tickets.map(r=>r['ticketNumber'])).size).toBe(2);
    TestBed.inject(TicketService).cancel('MOCK-T1','Motivo');expect(service.generate('tickets',{status:'Cancelado'}).length).toBe(1);
  });
  it('retains report filter drafts, supports all catalog results and safe local CSV',()=>{
    const fixture=TestBed.createComponent(Relatorios);fixture.detectChanges();const page=fixture.componentInstance;expect(page.catalog.length).toBe(9);
    page.filters.plate='ABC';page.select('tickets');page.filters.ticketNumber='MOCK';page.select('pesagens');expect(page.filters.plate).toBe('ABC');page.generate();fixture.detectChanges();expect(fixture.nativeElement.querySelector('tbody tr')).toBeTruthy();
    for(const report of page.catalog)expect(()=>page.service.generate(report.id,{})).not.toThrow();
    const csv=page.service.csv([{value:'=1+1',text:'Quoted "value"'}]);expect(csv).toContain("'=1+1");expect(csv).toContain('""value""');
    TestBed.inject(PermissionService).selectDemoUser('carlos');expect(()=>page.service.generate('pesagens',{})).toThrow();expect(()=>page.service.csv([])).toThrow();
  });
});

describe('Navegação integrada',()=>{
  it('opens all menu routes without runtime exceptions and preserves weighing across pages',async()=>{
    TestBed.configureTestingModule({providers:[provideRouter(routes),provideHttpClient()]});
    const harness=await RouterTestingHarness.create();const weighing=await harness.navigateByUrl('/pesagem',Pesagem);
    weighing.state.placa='ZZZ9Z99';weighing.state.confirm(weighing.state.preview(100,{peso:100,data:'now'}));
    for(const path of ['/cadastros','/relatorios','/tickets','/configuracoes']){await harness.navigateByUrl(path);expect(harness.routeNativeElement?.querySelector('h1')).toBeTruthy();}
    const restored=await harness.navigateByUrl('/pesagem',Pesagem);expect(restored.state.first).toBe(100);expect(restored.state.phase).toBe('aberta');
    await harness.navigateByUrl('/unknown');expect(TestBed.inject(Router).url).toBe('/pesagem');
  });
  it('asks before discarding an unsaved registry form',async()=>{
    TestBed.configureTestingModule({providers:[provideRouter(routes),provideHttpClient()]});const harness=await RouterTestingHarness.create();
    const page=await harness.navigateByUrl('/cadastros',Cadastros);page.open();const confirm=spyOn(window,'confirm').and.returnValue(false);
    await harness.navigateByUrl('/relatorios');expect(TestBed.inject(Router).url).toBe('/cadastros');confirm.and.returnValue(true);await harness.navigateByUrl('/relatorios');expect(TestBed.inject(Router).url).toBe('/relatorios');
  });
});
