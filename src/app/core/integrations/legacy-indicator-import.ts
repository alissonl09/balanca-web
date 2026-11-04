import { Injectable, inject } from '@angular/core';
import { IndicadorPesoConfiguracao } from '../../models/indicador.model';
import { ModeloIndicadorService } from '../../services/modelo-indicador.service';
import { IndicatorInstallation } from '../models/station-settings';

/** Leitura explícita, sem migrar/apagar storage legado nem assumir uma estação. */
@Injectable({ providedIn: 'root' })
export class LegacyIndicatorImport {
  private readonly models = inject(ModeloIndicadorService);
  read(): IndicatorInstallation | null {
    const value = localStorage.getItem('balanca-configuracao-indicador');
    if (!value) return null;
    const old = JSON.parse(value) as IndicadorPesoConfiguracao;
    if (!old?.id || !old.comunicacao) throw new Error('Configuração legada inválida.');
    const model = this.models.obterPorId(old.modelo);
    const c = old.comunicacao;
    return { id: old.id, name: old.nome, modelId: `legacy:${old.modelo}`, active: old.ativo,
      communication: c.tipo === 'SERIAL' ? 'Serial' : 'TCP/IP',
      com: c.tipo === 'SERIAL' ? c.portaSerial : '', baudRate: c.tipo === 'SERIAL' ? c.velocidadeSerial : null,
      dataBits: c.tipo === 'SERIAL' ? c.bitsDados : null, parity: c.tipo === 'SERIAL' ? c.paridade : '',
      stopBits: c.tipo === 'SERIAL' ? c.bitsParada : null, flowControl: c.tipo === 'SERIAL' ? c.controleFluxo : '',
      protocol: model?.protocolo ?? '', ip: c.tipo === 'TCP_IP' ? c.enderecoIp : '', port: c.tipo === 'TCP_IP' ? c.portaTcp : null,
      timeout: c.tipo === 'TCP_IP' ? c.timeoutTcp * 1000 : 5000, reconnect: 3000 };
  }
}
