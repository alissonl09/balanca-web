import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { PreTicketResponse } from './models/pre-ticket-response';

/**
 * Cria uma pré-ticket simulada para os testes.
 */
function criarPreTicket(
  tipoOperacao: string | null
): PreTicketResponse {
  return {
    tipoDocumento:
      tipoOperacao === null ? 'EPA' : 'XFER',

    tipoOperacao,

    nota: 'Documento de teste',
    emissor: 'Emissor de teste',
    motorista: 'Motorista de teste',
    transportador: 'Transportador de teste',

    quantidadeTotal: 4511,
    codigoEmbalagem: 'BAG',
    deposito: 'Depósito de teste',
    numeroSequencia: 1,

    numeroTicketOrigem:
      tipoOperacao === 'ENTRADA' ? 0 : null,

    codigoUnidadeOrigem:
      tipoOperacao === 'ENTRADA' ? 0 : null,

    pesoLiquidoOrigem:
      tipoOperacao === 'ENTRADA' ? 0 : null,

    codigoRetorno: 'S',
    descricaoRetorno:
      'Pré-ticket encontrada com sucesso.',
  };
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],

      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should render the title Pesagem', () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    const compiled =
      fixture.nativeElement as HTMLElement;

    expect(
      compiled.querySelector('h1')?.textContent
    ).toContain('Pesagem');
  });

  it('should display origin data for ENTRADA', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.preTicket = criarPreTicket('ENTRADA');

    expect(app.exibirDadosOrigem).toBe(true);
  });

  it('should not display origin data for SAIDA', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.preTicket = criarPreTicket('SAIDA');

    expect(app.exibirDadosOrigem).toBe(false);
  });

  it('should not display origin data for EPA', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.preTicket = criarPreTicket(null);

    expect(app.exibirDadosOrigem).toBe(false);
  });
});