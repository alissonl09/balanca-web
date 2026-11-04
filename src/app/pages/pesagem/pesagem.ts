import { PageHeadingComponent } from '../../shared/components/page-heading';
import { WeighingActionsComponent } from '../../shared/components/weighing-actions';
import { WeightPanelsComponent } from '../../shared/components/weight-panels';
import { GateSceneComponent } from '../../shared/components/gate-scene';
import { InformationDisplayComponent } from '../../shared/components/information-display';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { StationContext } from '../../core/state/station-context';
import { DemoSession } from '../../core/state/demo-session';
import { StationSettingsService, gateOptions } from '../../core/state/station-settings.service';
import { PermissionService } from '../../core/state/permission.service';
import { PrintGatewayService, PrintDocument } from '../../core/integrations/print-gateway';
import { PrintPreviewComponent } from '../../shared/components/print-preview';
import { StationIndicator } from '../../core/integrations/station-indicator';
import { LeituraEstacao } from '../../core/models/station';
import { PreTicketResponse } from '../../models/pre-ticket-response';
import { ConfiguracaoGeralService } from '../../services/configuracao-geral.service';
import { PreTicketService } from '../../services/pre-ticket.service';
import { Action, fields, normalizePlate, PesagemState, Preview, PRINT_PORT } from './pesagem-state';
import { PesagemMocks } from './pesagem-mocks';

@Component({ selector: 'app-pesagem', standalone: true, imports: [CommonModule, FormsModule, PrintPreviewComponent, WeightPanelsComponent, GateSceneComponent, InformationDisplayComponent, WeighingActionsComponent, PageHeadingComponent],
  providers: [PesagemMocks], templateUrl: './pesagem.html', styleUrl: './pesagem.css' })
export class Pesagem implements OnDestroy {
  readonly state = inject(PesagemState);
  readonly mock = inject(PesagemMocks);
  readonly settings = inject(StationSettingsService);
  readonly auth = inject(PermissionService);
  private readonly printGateway = inject(PrintGatewayService);
  printDocument: PrintDocument | null = null;
  private lastScope = '';
  private readonly gateStates = new Map<string, PesagemMocks['gates']>();
  private readonly applySettings = effect(() => {
    const config = this.settings.settings();
    const key = this.settings.key();
    if (key !== this.lastScope) {
      this.lastScope = key;
      if (key !== this.state.stationKey) { this.novaPesagem(); this.state.stationKey = key; }
      this.closeModal();
      this.mock.gates = this.gateStates.get(key) ?? {};
      this.gateStates.set(key, this.mock.gates);
    }
    this.state.manualEnabled = config.general.manual;
    this.mock.sgv = config.general.sgv;
    this.mock.gatesEnabled = config.vehicles.gates;
    this.mock.lightsEnabled = config.vehicles.lights;
    this.mock.displayEnabled = config.vehicles.display;
    this.mock.display = config.vehicles.message;
    this.mock.bindEquipments(config.vehicles.entryId, config.vehicles.exitId);
    this.state.permissions = { weigh: this.auth.can('weigh'), editOpen: this.auth.can('editOpen'),
      useManual: this.auth.can('useManual'), authorizeManual: this.auth.can('authorizeManual'),
      print: this.auth.can('printTicket') || this.auth.can('reprintTicket') };
  });
  gateLabel(side: string): string {
    return gateOptions.find(g => g.id === this.mock.equipment(side))?.name ?? 'Não parametrizada';
  }
  private readonly api = inject(PreTicketService);
  private readonly config = inject(ConfiguracaoGeralService);
  private readonly context = inject(StationContext);
  private readonly indicator = inject(StationIndicator);
  private readonly printer = inject(PRINT_PORT);
  private readonly session = inject(DemoSession);
  readonly fields = fields;
  readonly actions: { id: Action; label: string; key: string }[] = [
    { id: 'imprimir', label: 'Impr. Pesagem', key: 'F5' }, { id: 'nova', label: 'Nova Pesagem', key: 'F6' },
    { id: 'salvar', label: 'Salvar Pesagem', key: 'F10' }, { id: 'manual', label: 'Peso Manual', key: 'F11' },
    { id: 'pesar', label: 'Pesagem', key: 'F12' }
  ];
  @ViewChild('plateInput') plateInput?: ElementRef<HTMLInputElement>;
  @ViewChild('trailerInput') trailerInput?: ElementRef<HTMLSelectElement>;
  @ViewChild('modalElement') modalElement?: ElementRef<HTMLElement>;
  mode: 'mock' | 'real' = 'mock';
  preTicket: PreTicketResponse | null = null;
  carregando = false;
  mensagem = '';
  modal: 'auth' | 'weight' | 'confirm' | 'print' | null = null;
  modalError = '';
  user = ''; password = ''; justification = ''; manualWeight: number | null = null;
  pending: Preview | null = null;
  printPreview: Preview | null = null;
  vehicleTab = 'patio'; search = '';
  private lookupSubscription?: Subscription;
  private readingSubscription?: Subscription;
  private generation = 0;
  private previousFocus?: HTMLElement;
  private realReading: LeituraEstacao = { peso: null, unidade: 'kg', conectado: false, estavel: false, erro: 'Agente não configurado', dataHoraLeitura: null };
  private readonly observeContext = effect(() => {
    const context = this.context.contexto();
    this.readingSubscription?.unsubscribe();
    this.realReading = { ...this.realReading, conectado: false, peso: null };
    if (context) this.readingSubscription = this.indicator.observar(context.estacao.id).subscribe(value => this.realReading = value);
  });
  get placa(): string { return this.state.placa; }
  set placa(value: string) { this.state.placa = value; }
  get reading(): LeituraEstacao {
    const value = this.mode === 'mock' ? this.mock.reading : this.realReading;
    const installations = this.settings.settings().indicators;
    if (installations.length && !installations.some(i => i.active)) return { ...value, peso: null, conectado: false, estavel: false, comunicacao: 'Desconectado', erro: 'Indicadores inativos.' };
    return { ...value, comunicacao: value.comunicacao ?? (value.conectado ? 'Conectado' : value.erro ? 'Sem comunicação' : 'Desconectado') };
  }
  get exibirDadosOrigem(): boolean { return this.preTicket?.tipoOperacao?.trim().toUpperCase() === 'ENTRADA'; }
  get vehicles() {
    const tab = this.mock.sgv ? this.vehicleTab : 'operacao';
    const search = this.search.trim().toUpperCase();
    return this.mock.vehicles.filter(v => v.local === tab && `${v.placa} ${v.carreta ?? ''}`.includes(search));
  }
  can(action: Action): boolean { return this.auth.canWeighAction(action) && this.session.loggedIn && !document.querySelector('.session-backdrop') && !this.carregando && !this.modal && this.state.can(action, this.reading.conectado); }
  readonlyField(field: string): boolean {
    return field === 'Operador' || Object.hasOwn(this.state.official, field) || this.state.phase === 'fechada' ||
      (this.state.phase === 'aberta' ? !this.state.permissions.editOpen : !this.state.permissions.weigh);
  }
  operator(): string { return this.session.user; }
  @HostListener('document:keydown', ['$event'])
  onShortcut(event: KeyboardEvent): void {
    if (this.modal && event.key === 'Escape') { event.preventDefault(); this.closeModal(); return; }
    if (this.modal && event.key === 'Tab') {
      const controls = this.modalElement?.nativeElement.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea,select');
      if (controls?.length) {
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const action = this.actions.find(a => a.key === event.key);
    if (!action) return;
    event.preventDefault();
    if (!event.repeat) this.runAction(action.id);
  }
  runAction(action: Action): void {
    if (!this.can(action)) return;
    this.mensagem = '';
    this.state.draft['Operador'] = this.operator();
    switch (action) {
      case 'nova': this.novaPesagem(); break;
      case 'salvar':
        try { this.state.save(); this.printGateway.publish(this.settings.key(), this.state.confirmed ?? this.state.preview(0,null), [this.state.first,this.state.second,this.state.net,this.state.dry]); this.mensagem = 'Dados atualizados em memória. Nenhum peso ou ticket foi gerado.'; }
        catch (error) { this.mensagem = (error as Error).message; } break;
      case 'imprimir':
        this.printPreview = this.printer.preview(this.state.confirmed ?? this.state.preview(0, null));
        this.printGateway.publish(this.settings.key(), this.printPreview, [this.state.first,this.state.second,this.state.net,this.state.dry]);
        this.printDocument = this.printGateway.preview(this.settings.key(), this.settings.settings().printing, 'Ticket');
        this.openModal('print'); break;
      case 'manual':
        if (this.state.phase === 'fechada') { this.mensagem = 'Inicie uma nova pesagem.'; return; }
        this.user = this.password = this.justification = ''; this.manualWeight = null; this.openModal('auth'); break;
      case 'pesar':
        if (this.state.phase === 'fechada') { this.mensagem = 'Inicie uma nova pesagem.'; return; }
        // A referência desconectada permite preview, sem criar captura.
        const value = this.reading.conectado ? this.reading.peso ?? 0 : 0;
        this.pending = this.state.preview(value, this.reading.conectado && this.reading.estavel && value > 0
          ? { peso: value, data: this.reading.dataHoraLeitura ?? new Date().toISOString() } : null);
        this.openModal('confirm'); break;
    }
  }
  openModal(value: NonNullable<Pesagem['modal']>): void {
    if (!this.modal) this.previousFocus = document.activeElement as HTMLElement;
    this.modalError = ''; this.modal = value;
    setTimeout(() => this.modalElement?.nativeElement.querySelector<HTMLElement>('input,button')?.focus());
  }
  closeModal(): void { this.modal = null; this.pending = null; this.password = ''; this.justification = ''; this.previousFocus?.focus(); }
  authorize(): void {
    if (!this.mock.authorize(this.user, this.password, this.justification, this.auth.userCan(this.user, 'authorizeManual'))) {
      this.modalError = 'Autorização inválida, sem permissão ou justificativa ausente.'; return;
    }
    this.password = ''; this.openModal('weight');
  }
  enterManualWeight(): void {
    const value = Number(this.manualWeight);
    if (!Number.isFinite(value) || value <= 0) { this.modalError = 'Informe peso maior que zero.'; return; }
    if (!this.state.can('manual', this.reading.conectado) || !this.auth.userCan(this.user, 'authorizeManual')) {
      this.modalError = 'Permissão manual indisponível.'; return;
    }
    this.pending = this.state.preview(value, { peso: value, data: new Date().toISOString(), autorizador: this.user, justificativa: this.justification.trim() });
    this.openModal('confirm');
  }
  confirm(): void {
    if (!this.pending) return;
    const manual = !!this.pending.captura?.autorizador;
    if (!manual && this.pending.captura && (!this.reading.conectado || !this.reading.estavel)) {
      this.modalError = 'Indicador sem comunicação ou estabilidade. Cancele e inicie outra confirmação.'; return;
    }
    if (!this.auth.canWeighAction(manual ? 'manual' : 'pesar') || !this.state.can(manual ? 'manual' : 'pesar', this.reading.conectado) || (manual && !this.auth.userCan(this.pending.captura!.autorizador!, 'authorizeManual'))) {
      this.modalError = 'Permissão indisponível.'; return;
    }
    try {
      this.state.confirm(this.pending);
      this.printGateway.publish(this.settings.key(), this.state.confirmed ?? this.state.preview(0,null), [this.state.first,this.state.second,this.state.net,this.state.dry]);
      this.closeModal(); this.mensagem = 'Confirmação local. Sem gravação corporativa.';
    }
    catch (error) { this.modalError = (error as Error).message; }
  }
  novaPesagem(): void {
    this.lookupSubscription?.unsubscribe(); ++this.generation;
    this.carregando = false; this.preTicket = null; this.state.reset();
    this.state.draft['Operador'] = this.operator(); this.mensagem = '';
    this.printGateway.publish(this.settings.key(), this.state.preview(0,null));
    setTimeout(() => this.plateInput?.nativeElement.focus());
  }
  limparConsulta(): void { this.novaPesagem(); }
  changeMode(): void { this.novaPesagem(); }
  onPlateTab(event: KeyboardEvent): void {
    if (event.key === 'Tab' && !event.shiftKey && !this.state.consulted && /^[A-Z]{3}\d[A-Z\d]\d{2}$/.test(normalizePlate(this.placa))) this.consultarPreTicket();
  }
  consultarPreTicket(): void {
    if (this.carregando || this.state.consulted || this.state.phase !== 'nova') return;
    this.placa = normalizePlate(this.placa);
    if (!/^[A-Z]{3}\d[A-Z\d]\d{2}$/.test(this.placa)) { this.mensagem = 'Informe uma placa válida.'; return; }
    this.mensagem = '';
    if (this.mode === 'mock') {
      const result = this.mock.lookup(this.placa);
      if (result) this.state.integrate({ ...result.operation, Operador: this.operator() }, result.trailers, result.first);
      else this.mensagem = 'Placa não encontrada no mock. Preencha os dados manualmente.';
      this.focusAfterLookup(); return;
    }
    const unit = this.context.contexto()?.unidade.codigo ?? this.config.obterCodigoUnidadeBalanca();
    if (!unit) { this.mensagem = 'Configure a unidade antes de consultar a Libra-API.'; return; }
    const generation = ++this.generation;
    const queriedPlate = this.placa;
    this.carregando = true;
    this.lookupSubscription = this.api.buscarPreTicket(unit, this.placa).subscribe({
      next: response => {
        if (generation !== this.generation || normalizePlate(this.placa) !== queriedPlate) { this.carregando = false; return; }
        this.carregando = false;
        if (response.codigoRetorno !== 'S') { this.mensagem = response.descricaoRetorno; return; }
        this.preTicket = response;
        const entries = { Motorista: response.motorista, Transportadora: response.transportador, 'Emissor(es)': response.emissor,
          'Depósito': response.deposito, 'Tipo do documento': response.tipoDocumento, 'Nº Nota(s) / Documento(s)': response.nota,
          'Peso N.F. (Kg)': response.quantidadeTotal, Embalagem: response.codigoEmbalagem };
        this.state.integrate(Object.fromEntries(Object.entries(entries).map(([k,v]) => [k, v == null ? '' : String(v)])), response.placasCarretas ?? []);
        this.state.draft['Operador'] = this.operator(); this.focusAfterLookup();
      },
      error: (error: HttpErrorResponse) => {
        if (generation !== this.generation) return;
        this.carregando = false;
        const fields = error.error?.campos;
        const messages: Record<number, string> = {
          0: 'Não foi possível acessar a Libra-API. Verifique conexão, certificado HTTPS e CORS.',
          400: fields ? Object.values(fields).join(' ') : 'Verifique os parâmetros informados.',
          401: 'Falha de autenticação com a Libra-API.',
          404: 'Nenhuma pré-ticket encontrada para a placa informada.',
          409: 'Existe um conflito entre as pré-tickets encontradas.',
          500: 'Ocorreu um erro interno durante a consulta.'
        };
        this.mensagem = (error.error?.descricaoRetorno ?? messages[error.status] ?? 'Consulta indisponível.') + ' Entrada manual disponível; nenhum mock aplicado à resposta real.';
      }
    });
  }
  private focusAfterLookup(): void {
    setTimeout(() => {
      if (this.state.trailers.length > 1) this.trailerInput?.nativeElement.focus();
      else document.querySelector<HTMLInputElement>('.operation-grid input:not([readonly])')?.focus();
    });
  }
  ngOnDestroy(): void { ++this.generation; this.lookupSubscription?.unsubscribe(); this.readingSubscription?.unsubscribe(); }
}
