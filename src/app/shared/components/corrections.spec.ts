import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../app';
import { routes } from '../../app.routes';
import { Configuracoes } from '../../pages/configuracoes/configuracoes';
import { Pesagem } from '../../pages/pesagem/pesagem';
import { Cadastros } from '../../pages/cadastros/cadastros';
import { Relatorios } from '../../pages/relatorios/relatorios';
import { StationSettingsService, demoContexts, STATION_DIRECTORY } from '../../core/state/station-settings.service';
import { PermissionService } from '../../core/state/permission.service';
import { GateSceneComponent } from './gate-scene';
import { InformationDisplayComponent } from './information-display';
registerLocaleData(localePt, 'pt-BR');

describe('Correções de contexto e controles visuais', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient()] }));

  it('publishes select changes without an additional Apply click and saves to that station', async () => {
    const f = TestBed.createComponent(Configuracoes); f.detectChanges(); await f.whenStable();
    const select = async (index: number, value: string) => {
      const field = f.nativeElement.querySelectorAll('.grid select')[index] as HTMLSelectElement;
      field.value = value; field.dispatchEvent(new Event('change')); f.detectChanges(); await f.whenStable();
    };
    await select(0, 'demo-japy');
    expect(f.componentInstance.store.context.contexto()).toBeNull();
    await select(1, 'demo-japy-2');
    expect(f.componentInstance.store.context.contexto()?.estacao.id).toBe('demo-japy-2');
    f.componentInstance.draft.general.sgv = true; f.componentInstance.save();
    expect(f.componentInstance.store.settings().general.sgv).toBeTrue();
    expect(f.componentInstance.message).toContain('salva');
  });

  it('auto-selects the only active station and clears a previous context while another unit is pending', () => {
    const f = TestBed.createComponent(Configuracoes); f.detectChanges(); const page = f.componentInstance;
    page.changeUnit('demo-matriz'); f.detectChanges();
    expect(page.store.context.contexto()?.estacao.id).toBe('demo-matriz-1');
    page.changeUnit('demo-japy'); f.detectChanges();
    expect(page.unitId).toBe('demo-japy'); expect(page.stationId).toBe('');
    expect(page.store.context.contexto()).toBeNull(); page.save();
    expect(page.message).toContain('Selecione unidade');
    page.changeStation('demo-matriz-1'); expect(page.store.context.contexto()).toBeNull();
  });

  it('auto-selects a sole unit/station from a replaceable directory', () => {
    TestBed.overrideProvider(STATION_DIRECTORY, { useValue: [demoContexts[2]] });
    const f = TestBed.createComponent(Configuracoes); f.detectChanges();
    expect(f.componentInstance.unitId).toBe('demo-matriz');
    expect(f.componentInstance.store.context.contexto()?.estacao.id).toBe('demo-matriz-1');
  });

  it('loads saved settings when switching back and propagates to Pesagem', () => {
    const f = TestBed.createComponent(Configuracoes); f.detectChanges(); const page = f.componentInstance;
    page.changeUnit('demo-matriz'); f.detectChanges(); page.draft.general.sgv = true; page.save(); f.detectChanges();
    page.changeUnit('demo-japy'); page.changeStation('demo-japy-1'); f.detectChanges();
    expect(page.draft.general.sgv).toBeFalse();
    page.changeUnit('demo-matriz'); f.detectChanges(); expect(page.draft.general.sgv).toBeTrue();
    const weighing = TestBed.createComponent(Pesagem); weighing.detectChanges();
    expect(weighing.nativeElement.querySelector('.access')).toBeTruthy();
  });

  it('uses bounded reusable field widths, including Serial, TCP and printing fields', () => {
    const f = TestBed.createComponent(Configuracoes); f.detectChanges(); const page = f.componentInstance;
    f.nativeElement.style.width = '1100px';
    page.addIndicator();
    for (const tab of ['general', 'indicators', 'printing'] as const) {
      page.tab = tab; f.detectChanges();
      f.nativeElement.querySelectorAll('label select').forEach((select: HTMLSelectElement) => {
        expect(select.getBoundingClientRect().width).toBeLessThanOrEqual(301);
        expect(select.parentElement!.className).toMatch(/field-(sm|md|lg|full)/);
      });
    }
    page.tab = 'indicators'; page.draft.indicators[0].communication = 'TCP/IP'; f.detectChanges();
    f.nativeElement.querySelectorAll('.tcp-fields input').forEach((input: HTMLInputElement) => expect(input.getBoundingClientRect().width).toBeLessThanOrEqual(301));
  });

  it('shows SGV panel even without devices and renders each device independently', () => {
    const store = TestBed.inject(StationSettingsService); store.select(demoContexts[0]);
    const f = TestBed.createComponent(Pesagem); f.detectChanges();
    expect(f.nativeElement.querySelector('.access')).toBeNull();
    const draft = structuredClone(store.settings()); draft.general.sgv = true; store.save('general', draft); f.detectChanges();
    expect(f.nativeElement.querySelector('.access').textContent).toContain('Nenhum componente');
    for (const device of ['gates', 'lights', 'display'] as const) {
      draft.vehicles.gates = device === 'gates'; draft.vehicles.lights = device === 'lights'; draft.vehicles.display = device === 'display';
      draft.vehicles.message = 'INFORMAÇÃO BALANÇA'; store.save('vehicles', draft); f.detectChanges();
      expect(f.nativeElement.querySelectorAll('.gate').length).toBe(device === 'gates' ? 2 : 0);
      expect(f.nativeElement.querySelectorAll('.traffic-light').length).toBe(device === 'lights' ? 2 : 0);
      expect(!!f.nativeElement.querySelector('.access-display')).toBe(device === 'display');
      if (device === 'display') {
        const display = f.nativeElement.querySelector('app-information-display .access-display');
        expect(display).toBeTruthy(); expect(getComputedStyle(display).overflow).toBe('hidden');
      }
    }
    expect(f.nativeElement.querySelector('.access-display').textContent).toBe('INFORMACAO BALANCA');
    draft.vehicles.message = 'COOXUPÉ'; store.save('vehicles', draft); f.detectChanges();
    expect(f.nativeElement.querySelector('.access-display').textContent).toBe('COOXUPE');
    draft.general.sgv = false; store.save('general', draft); f.detectChanges();
    expect(f.nativeElement.querySelector('.access')).toBeNull();
  });

  it('contains both mirrored arms at all angles without colliding with the adjacent vertical light', () => {
    const f = TestBed.createComponent(GateSceneComponent); f.componentRef.setInput('gates', true); f.componentRef.setInput('lights', true);
    for (const side of ['entrada', 'saida']) for (const state of ['fechada', 'movendo', 'aberta']) {
      f.componentRef.setInput('side', side); f.componentRef.setInput('state', state); f.detectChanges();
      const arm = f.nativeElement.querySelector('.gate span') as HTMLElement; arm.style.transition = 'none';
      const a = arm.getBoundingClientRect(), lane = f.nativeElement.querySelector('.lane').getBoundingClientRect();
      const light = f.nativeElement.querySelector('.traffic-light').getBoundingClientRect();
      const motor = f.nativeElement.querySelector('.gate-motor').getBoundingClientRect();
      expect(a.top).toBeGreaterThanOrEqual(lane.top); expect(a.bottom).toBeLessThanOrEqual(lane.bottom);
      expect(a.left).toBeGreaterThanOrEqual(lane.left); expect(a.right).toBeLessThanOrEqual(lane.right);
      expect(side === 'entrada' ? light.right <= a.left : a.right <= light.left).toBeTrue();
      expect(Math.abs(side === 'entrada' ? motor.left - light.right : light.left - motor.right)).toBeLessThanOrEqual(5);
      const bulbs = f.nativeElement.querySelectorAll('.traffic-light span');
      expect(bulbs[0].getBoundingClientRect().top).toBeLessThan(bulbs[1].getBoundingClientRect().top);
      expect(!!f.nativeElement.querySelector('.green.on')).toBe(state === 'aberta');
    }
  });

  it('scrolls a long message from the display edge until the entire text exits, without widening the card', () => {
    const f = TestBed.createComponent(InformationDisplayComponent);
    f.nativeElement.style.width = '240px';
    f.componentRef.setInput('message', 'COOXUPE BALANCA INFORMACAO - ENTRADA 01'); f.detectChanges();
    const display = f.nativeElement.querySelector('.access-display') as HTMLElement;
    const span = display.querySelector('span')!;
    expect(getComputedStyle(display).overflow).toBe('hidden');
    expect(display.getBoundingClientRect().width).toBe(240);
    expect(span.getBoundingClientRect().width).toBeGreaterThan(display.clientWidth);
    const animation = span.getAnimations()[0]; expect(animation).toBeTruthy();
    animation.pause(); animation.currentTime = 0;
    expect(Math.abs(span.getBoundingClientRect().left - (display.getBoundingClientRect().right - 6))).toBeLessThan(2);
    animation.currentTime = Number(animation.effect!.getTiming().duration) * .999;
    expect(span.getBoundingClientRect().right).toBeLessThanOrEqual(display.getBoundingClientRect().left + 8);
    expect(display.getBoundingClientRect().width).toBe(240);
  });
});

describe('Navegação real pelos controles da interface', () => {
  it('navigates via all five menu buttons and keeps a consistent visual icon area', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient()] });
    const f = TestBed.createComponent(App); f.detectChanges(); const router = TestBed.inject(Router);
    for (const path of ['/cadastros', '/relatorios', '/tickets', '/configuracoes', '/pesagem']) {
      const button = f.nativeElement.querySelector(`[routerlink="${path}"]`) as HTMLButtonElement;
      expect(button.disabled).toBeFalse(); button.click(); await f.whenStable(); f.detectChanges();
      expect(router.url).toBe(path); expect(f.nativeElement.querySelector('main h1')).toBeTruthy();
      const icon = button.querySelector('.menu-image') as HTMLElement;
      const style = getComputedStyle(icon), expectedSize = innerWidth <= 1000 ? '28px' : '34px';
      expect(style.width).toBe(expectedSize); expect(style.height).toBe(expectedSize); expect(style.flexShrink).toBe('0');
      if (path === '/pesagem') expect(getComputedStyle(icon).transform).toContain('1.25');
    }
  });

  it('explains a restricted profile after navigation without granting registry or report access', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient()] });
    const f = TestBed.createComponent(App); TestBed.inject(PermissionService).selectDemoUser('carlos'); f.detectChanges();
    for (const path of ['/cadastros', '/relatorios']) {
      const button = f.nativeElement.querySelector(`[routerlink="${path}"]`) as HTMLButtonElement;
      expect(button.title).toContain('permissão'); button.click(); await f.whenStable(); f.detectChanges();
      expect(TestBed.inject(Router).url).toBe(path); expect(f.nativeElement.querySelector('main').textContent).toContain('Acesso restrito');
      expect(f.nativeElement.querySelector('main table')).toBeNull();
    }
  });

  it('changes all seven registry tabs with their actual click handlers', () => {
    const f = TestBed.createComponent(Cadastros); f.detectChanges();
    const buttons = f.nativeElement.querySelectorAll('.tabs button'); expect(buttons.length).toBe(7);
    buttons.forEach((button: HTMLButtonElement, index: number) => {
      button.click(); f.detectChanges(); expect(f.componentInstance.kind).toBe(f.componentInstance.kinds[index][0]);
      expect(button.classList.contains('selected')).toBeTrue(); expect(f.nativeElement.querySelectorAll('.tabs .selected').length).toBe(1);
      expect(f.nativeElement.querySelector('tbody')).toBeTruthy();
    });
  });

  it('changes every report and renders its filters and title', () => {
    const f = TestBed.createComponent(Relatorios); f.detectChanges();
    const buttons = f.nativeElement.querySelectorAll('.cards button'); expect(buttons.length).toBe(f.componentInstance.catalog.length);
    buttons.forEach((button: HTMLButtonElement, index: number) => {
      button.click(); f.detectChanges(); const definition = f.componentInstance.catalog[index];
      expect(f.componentInstance.service.selected).toBe(definition.id); expect(button.classList.contains('selected')).toBeTrue();
      expect(f.nativeElement.querySelector('h2').textContent).toBe(definition.title);
      expect(f.nativeElement.querySelectorAll('.grid>label').length).toBe(definition.filters.length);
    });
  });
});
