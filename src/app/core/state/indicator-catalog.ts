import { Injectable, inject, signal } from '@angular/core';
import { IndicatorModel } from '../models/station-settings';
import { PermissionService } from './permission.service';
import { ModeloIndicadorService } from '../../services/modelo-indicador.service';

function unknown(id: string, name: string): IndicatorModel {
  return { id, name, active: true, serial: false, tcp: false, protocols: [], baudRates: [], dataBits: [], parities: [], stopBits: [], flowControls: [] };
}
@Injectable({ providedIn: 'root' })
export class IndicatorCatalog {
  private readonly permissions = inject(PermissionService);
  private readonly legacy = inject(ModeloIndicadorService);
  private readonly rows = signal<IndicatorModel[]>([
    { ...unknown('IND570','Toledo IND570'), serial: true, tcp: true,
      baudRates: [300,600,1200,2400,4800,9600,19200,38400,57600,115200], dataBits: [7,8],
      parities: ['None','Odd','Even'], stopBits: [1,2], flowControls: ['None','XON/XOFF'],
      protocols: ['MT Continuous / Continuous Output','Continuous Template','Demand Output'] },
    unknown('IND560','Toledo IND560'), unknown('G10K','Gênova G10K'), unknown('9700','Tolflux 9700')
  ]);
  readonly models = this.rows.asReadonly();
  save(model: IndicatorModel, creating = false): void {
    if (!this.permissions.can('indicatorModels')) throw new Error('Sem permissão para modelos.');
    if (!model.id.trim() || !model.name.trim()) throw new Error('Código e nome obrigatórios.');
    if (creating && this.models().some(m => m.id === model.id)) throw new Error('Código duplicado.');
    if (model.serial && [model.baudRates, model.dataBits, model.parities, model.stopBits, model.flowControls].some(a => !a.length)) throw new Error('Informe as capacidades Serial.');
    if ((model.serial || model.tcp) && !model.protocols.length) throw new Error('Informe protocolos documentados.');
    if ([...model.baudRates,...model.dataBits,...model.stopBits].some(n => !Number.isInteger(n) || n <= 0)) throw new Error('Capacidades numéricas inválidas.');
    this.rows.update(rows => [...rows.filter(m => m.id !== model.id), structuredClone(model)]);
  }
  importLegacy(): void {
    for (const old of this.legacy.listar()) {
      const defaults = old.configuracaoSerialPadrao;
      this.save({ id: `legacy:${old.id}`, name: `${old.fabricante} ${old.modelo}`, active: old.ativo,
        serial: old.suportaSerial, tcp: old.suportaTcpIp, protocols: [old.protocolo],
        baudRates: defaults ? [defaults.velocidadeSerial] : [], dataBits: defaults ? [defaults.bitsDados] : [],
        parities: defaults ? [defaults.paridade] : [], stopBits: defaults ? [defaults.bitsParada] : [],
        flowControls: defaults ? [defaults.controleFluxo] : [] });
    }
  }
}
