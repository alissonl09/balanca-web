import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Pesagem } from '../../pages/pesagem/pesagem';
import { App } from '../../app';
import { GateSceneComponent } from './gate-scene';
registerLocaleData(localePt,'pt-BR');
describe('Fidelidade visual — estrutura essencial',()=>{
 it('renders five action icons, preserves illustrated assets and all shortcut badges',()=>{
  TestBed.configureTestingModule({imports:[Pesagem],providers:[provideHttpClient()]});
  const fixture=TestBed.createComponent(Pesagem);fixture.detectChanges();const root=fixture.nativeElement as HTMLElement;
  const buttons=root.querySelectorAll('.action-bar button');expect(buttons.length).toBe(5);
  buttons.forEach(button=>{expect(button.querySelector('.action-icon')).toBeTruthy();expect(button.querySelector('kbd')).toBeTruthy();expect(button.querySelector('.action-icon img,.action-icon svg,.action-icon .asset-icon')).toBeTruthy();});
  expect(root.querySelector('[data-action=imprimir] img')?.getAttribute('src')).toBe('/images/imprimir-pesagem.svg');
  expect(root.querySelector('[data-action=salvar] img')?.getAttribute('src')).toBe('/images/salvar-pesagem.svg');
  expect(root.querySelector('[data-action=nova] use')?.getAttribute('href')).toContain('#plus');
  expect([...root.querySelectorAll('kbd')].map(n=>n.textContent)).toEqual(['F5','F6','F10','F11','F12']);
 });
 it('uses Flutter field groups and equal visible heights for plate, trailer and operation fields',()=>{
  TestBed.configureTestingModule({imports:[Pesagem],providers:[provideHttpClient()]});
  const fixture=TestBed.createComponent(Pesagem);fixture.detectChanges();const root=fixture.nativeElement as HTMLElement;
  expect([...root.querySelectorAll('.operation-row')].map(row=>row.querySelectorAll('label').length)).toEqual([2,2,3,4]);
  const height=root.querySelector('#placa')!.getBoundingClientRect().height;
  root.querySelectorAll('.operation-section input,#placa-carreta').forEach(input=>expect(input.getBoundingClientRect().height).toBe(height));
  expect(root.querySelector('.search-row svg')).toBeTruthy();expect(root.querySelector('.reading-dot')).toBeTruthy();
 });
 it('uses vector menu icons and custom user menu header instead of text glyphs',()=>{
  TestBed.configureTestingModule({imports:[App],providers:[provideRouter([])]});const fixture=TestBed.createComponent(App);fixture.detectChanges();const root=fixture.nativeElement as HTMLElement;
  root.querySelectorAll('.menu-item').forEach(button=>expect(button.querySelector('.asset-icon,svg')).toBeTruthy());
  fixture.componentInstance.userMenu=true;fixture.detectChanges();expect(root.querySelector('.user-menu-header .profile-avatar')).toBeTruthy();expect(root.querySelectorAll('.user-menu button svg').length).toBe(2);
 });
 it('keeps the traffic lights vertical and the arm/motor within a fixed visual scene',()=>{
  TestBed.configureTestingModule({imports:[GateSceneComponent]});const fixture=TestBed.createComponent(GateSceneComponent);
  fixture.componentRef.setInput('gates',true);fixture.componentRef.setInput('lights',true);fixture.detectChanges();const root=fixture.nativeElement as HTMLElement;
  expect(root.querySelector('.gate-motor')).toBeTruthy();const bulbs=root.querySelectorAll('.traffic-light>span');expect(bulbs.length).toBe(2);expect(bulbs[0].classList.contains('red')).toBeTrue();expect(bulbs[1].classList.contains('green')).toBeTrue();
  expect(root.querySelector('.gate')!.getBoundingClientRect().width).toBe(100);expect(root.querySelector('.gate')!.getBoundingClientRect().height).toBe(70);
 });
});
