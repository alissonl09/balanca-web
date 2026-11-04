import { CommonModule } from '@angular/common';
import { Component, OnDestroy, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IndicatorInstallation, IndicatorModel, StationSettings, SettingsSection, validateIndicator } from '../../core/models/station-settings';
import { StationSettingsService, STATION_DIRECTORY, gateOptions, sectionPermission } from '../../core/state/station-settings.service';
import { PermissionService, Permission, permissionLabels } from '../../core/state/permission.service';
import { IndicatorCatalog } from '../../core/state/indicator-catalog';
import { IndicatorGatewayService, DiagnosticResult, diagnosticResults } from '../../core/integrations/indicator-gateway';
import { PrintGatewayService, PrintDocument, mockPrinters } from '../../core/integrations/print-gateway';
import { PrintPreviewComponent } from '../../shared/components/print-preview';
import { LegacyIndicatorImport } from '../../core/integrations/legacy-indicator-import';

type Tab = SettingsSection | 'models' | 'permissions';
@Component({ selector: 'app-configuracoes', standalone: true, imports: [CommonModule, FormsModule, PrintPreviewComponent],
  templateUrl: './configuracoes.html', styleUrl: './configuracoes.css' })
export class Configuracoes implements OnDestroy {
  readonly store = inject(StationSettingsService);
  readonly auth = inject(PermissionService);
  readonly catalog = inject(IndicatorCatalog);
  private readonly gateway = inject(IndicatorGatewayService);
  private readonly printer = inject(PrintGatewayService);
  private readonly legacyIndicator = inject(LegacyIndicatorImport);
  readonly contexts = inject(STATION_DIRECTORY).filter(c => c.estacao.ativo && c.estacao.unidadeId === c.unidade.id);
  readonly units = [...new Map(this.contexts.map(c => [c.unidade.id, c.unidade])).values()];
  readonly gates = gateOptions;
  readonly printers = mockPrinters;
  readonly permissions = Object.entries(permissionLabels) as [Permission,string][];
  readonly scenarios = diagnosticResults;
  tab: Tab = 'general';
  readonly tabs: { id: Tab; label: string }[] = [ {id:'general',label:'Configurações Gerais'}, {id:'vehicles',label:'Gestão de Veículos'},
    {id:'printing',label:'Impressão'}, {id:'indicators',label:'Indicadores de Peso'}, {id:'models',label:'Modelos de Indicadores'}, {id:'permissions',label:'Permissões'} ];
  draft: StationSettings = structuredClone(this.store.settings());
  unitId = ''; stationId = '';
  message = ''; query = '';
  modelDraft: IndicatorModel | null = null;
  creatingModel = false;
  diagnosticScenario: DiagnosticResult = 'Comunicação estabelecida';
  diagnostic = ''; testing = false;
  previewDocument: PrintDocument | null = null;
  private testSubscription?: Subscription;
  private readonly refresh = effect(() => {
    this.draft = structuredClone(this.store.settings());
    const context = this.store.context.contexto();
    // Uma unidade ainda sem estação é uma escolha pendente, não um contexto ativo.
    if (context) { this.unitId = context.unidade.id; this.stationId = context.estacao.id; }
    this.testSubscription?.unsubscribe(); this.testing = false; this.diagnostic = '';
    if (!this.draft.general.sgv && this.tab === 'vehicles') this.tab = 'general';
  });
  constructor() {
    if (!this.store.context.contexto() && this.units.length === 1 && this.auth.can('generalSettings')) {
      this.changeUnit(this.units[0].id);
    }
  }
  get stations() { return this.contexts.filter(c => c.unidade.id === this.unitId); }
  changeUnit(id: string): void {
    if (!this.auth.can('generalSettings')) return;
    this.unitId = id;
    this.stationId = this.stations.length === 1 ? this.stations[0].estacao.id : '';
    this.changeStation(this.stationId);
  }
  changeStation(id: string): void {
    if (!this.auth.can('generalSettings')) return;
    this.stationId = id;
    if (this.contexts.some(c => c.unidade.id === this.unitId && c.estacao.id === id)) this.selectContext();
    else {
      this.store.context.limpar();
      this.message = 'Selecione uma estação para ativar o contexto desta unidade.';
    }
  }
  permission(tab = this.tab): Permission { return tab === 'models' ? 'indicatorModels' : tab === 'permissions' ? 'permissions' : sectionPermission[tab]; }
  allowed(): boolean { return this.auth.can(this.permission()); }
  selectTab(tab: Tab): void { this.stopTest(); this.tab = tab; this.message = ''; }
  selectContext(): void {
    const context = this.contexts.find(c => c.unidade.id === this.unitId && c.estacao.id === this.stationId);
    try {
      if (!context) throw new Error('Selecione unidade e estação.');
      this.stopTest(); this.store.select(context);
      this.draft = structuredClone(this.store.settings());
      this.message = 'Contexto ativo. Configuração isolada por estação.';
    } catch (e) { this.message = (e as Error).message; }
  }
  save(): void {
    try {
      if (this.tab === 'models' || this.tab === 'permissions') return;
      this.store.save(this.tab, this.draft);
      this.message = 'Configuração salva nesta sessão e publicada para a Pesagem. Sem integração física.';
    } catch (e) { this.message = (e as Error).message; }
  }
  swapGates(): void {
    if (!this.draft.vehicles.gates || !this.auth.can('vehicleSettings')) return;
    [this.draft.vehicles.entryId,this.draft.vehicles.exitId] = [this.draft.vehicles.exitId,this.draft.vehicles.entryId];
  }
  addIndicator(): void {
    if (!this.auth.can('indicators')) return;
    this.draft.indicators.push({ id: crypto.randomUUID(), name: '', modelId: '', active: true, communication: 'Serial',
      com: '', baudRate: null, dataBits: null, parity: '', stopBits: null, flowControl: '', protocol: '', ip: '', port: null, timeout: 5000, reconnect: 3000 });
  }
  importIndicator(): void {
    if (!this.auth.can('indicators') || !this.auth.can('indicatorModels')) return;
    try {
      const value = this.legacyIndicator.read();
      if (!value) throw new Error('Nenhum indicador legado encontrado.');
      this.catalog.importLegacy();
      this.draft.indicators = [...this.draft.indicators.filter(i => i.id !== value.id), value];
      this.message = 'Indicador legado copiado para o rascunho. Revise capacidades e salve na estação selecionada.';
    } catch (e) { this.message = (e as Error).message; }
  }
  model(id: string): IndicatorModel | undefined { return this.catalog.models().find(m => m.id === id); }
  selectModel(i: IndicatorInstallation): void {
    const m = this.model(i.modelId);
    Object.assign(i, { communication: m?.serial ? 'Serial' : 'TCP/IP', baudRate: null, dataBits: null, parity: '', stopBits: null, flowControl: '', protocol: '', ip: '', port: null, com: '' });
  }
  test(i: IndicatorInstallation): void {
    if (!this.auth.can('indicators')) return;
    const errors = validateIndicator(i, this.model(i.modelId));
    if (errors.length) { this.diagnostic = errors.join(' '); return; }
    this.stopTest(); this.testing = true; this.diagnostic = 'Conectando (mock)...';
    this.testSubscription = this.gateway.test(this.store.key(), i, this.diagnosticScenario).subscribe({
      next: value => { this.testing = false; this.diagnostic = `${value.state}: ${value.message}`; },
      error: () => { this.testing = false; this.diagnostic = 'Erro no gateway de diagnóstico.'; }
    });
  }
  stopTest(): void { this.testSubscription?.unsubscribe(); this.testing = false; }
  podeSairDaPagina(): boolean { this.stopTest(); return true; }
  ngOnDestroy(): void { this.stopTest(); }
  editModel(model?: IndicatorModel): void {
    this.creatingModel = !model;
    this.modelDraft = model ? structuredClone(model) : { id: '', name: '', active: true, serial: false, tcp: false, protocols: [], baudRates: [], dataBits: [], parities: [], stopBits: [], flowControls: [] };
  }
  arrayChange(key: 'protocols'|'baudRates'|'dataBits'|'parities'|'stopBits'|'flowControls', value: string): void {
    if (!this.modelDraft) return;
    const values = value.split(';').map(s => s.trim()).filter(Boolean);
    Object.assign(this.modelDraft, { [key]: ['baudRates','dataBits','stopBits'].includes(key) ? values.map(Number) : values });
  }
  saveModel(): void {
    try { if (this.modelDraft) this.catalog.save(this.modelDraft, this.creatingModel); this.modelDraft = null; this.message = 'Modelo salvo na sessão.'; }
    catch (e) { this.message = (e as Error).message; }
  }
  importModels(): void {
    try { this.catalog.importLegacy(); this.message = 'Catálogo legado importado explicitamente; capacidades limitadas aos parâmetros conhecidos.'; }
    catch (e) { this.message = (e as Error).message; }
  }
  grant(code: number, permission: Permission, checked: boolean): void {
    try { this.auth.setGrant(code,permission,checked); this.message = 'Matriz atualizada nesta sessão.'; }
    catch (e) { this.message = (e as Error).message; }
  }
  assign(id: string, profile: number): void {
    try { this.auth.assign(id, Number(profile)); this.message = 'Perfil atribuído no diretório mock.'; }
    catch (e) { this.message = (e as Error).message; }
  }
  paper(id: string) {
    const printer = this.printers.find(p => p.id === id)!;
    return this.draft.printing.paper[id] ??= { size: printer.sizes[0], source: printer.sources[0], orientation: 'Retrato' };
  }
  printerOption(id: string) { return this.printers.find(p => p.id === id)!; }
  preview(format: 'Ticket'|'A4'): void {
    if (!this.auth.can('printSettings')) return;
    this.previewDocument = this.printer.preview(this.store.key(), this.draft.printing, format);
  }
}
