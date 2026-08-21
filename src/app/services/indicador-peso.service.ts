import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import {
  ConfiguracaoSerialIndicador,
  EstadoIndicadorPeso,
  FinalidadeConexaoIndicador,
  IndicadorPesoConfiguracao,
  LeituraIndicadorPeso,
} from '../models/indicador.model';

// =========================================================
// Tipagens locais da Web Serial
// =========================================================

type ParidadeWebSerial = 'none' | 'even' | 'odd';

type ControleFluxoWebSerial = 'none' | 'hardware';

interface SerialOpenOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: ParidadeWebSerial;
  flowControl?: ControleFluxoWebSerial;
}

interface SerialPortInfoLocal {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPortLocal {
  readable: ReadableStream<Uint8Array> | null;

  open(options: SerialOpenOptions): Promise<void>;

  close(): Promise<void>;

  getInfo(): SerialPortInfoLocal;
}

interface SerialNavigatorLocal {
  requestPort(): Promise<SerialPortLocal>;

  getPorts(): Promise<SerialPortLocal[]>;
}

interface NavigatorComSerial extends Navigator {
  serial?: SerialNavigatorLocal;
}

// =========================================================
// Resultado da autorização
// =========================================================

export interface ResultadoAutorizacaoSerial {
  usbVendorId?: number;
  usbProductId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class IndicadorPesoService {
  // =========================================================
  // Estados dos indicadores
  // =========================================================

  private readonly estados = new Map<string, BehaviorSubject<EstadoIndicadorPeso>>();

  // =========================================================
  // Recursos Serial
  // =========================================================

  private readonly portasSeriais = new Map<string, SerialPortLocal>();

  private readonly leitoresSeriais = new Map<string, ReadableStreamDefaultReader<Uint8Array>>();

  private readonly buffersSeriais = new Map<string, string>();

  /*
   * Impede dois indicadores de utilizarem
   * a mesma porta física simultaneamente.
   */
  private readonly portasEmUso = new Set<SerialPortLocal>();

  // =========================================================
  // Registro do indicador
  // =========================================================

  registrarIndicador(configuracao: IndicadorPesoConfiguracao): void {
    if (this.estados.has(configuracao.id)) {
      return;
    }

    this.estados.set(
      configuracao.id,
      new BehaviorSubject<EstadoIndicadorPeso>(this.criarEstadoInicial(configuracao.id)),
    );
  }

  // =========================================================
  // Estado
  // =========================================================

  obterEstado$(idIndicador: string): Observable<EstadoIndicadorPeso> {
    return this.obterOuCriarEstado(idIndicador).asObservable();
  }

  obterEstadoAtual(idIndicador: string): EstadoIndicadorPeso {
    return this.obterOuCriarEstado(idIndicador).value;
  }

  // =========================================================
  // Verificação de teste ativo
  // =========================================================

  possuiTesteAtivo(idIndicador: string): boolean {
    const estado = this.obterEstadoAtual(idIndicador);

    return estado.finalidadeConexao === 'TESTE' && (estado.conectado || estado.conectando);
  }

  // =========================================================
  // Suporte à Web Serial
  // =========================================================

  possuiSuporteSerial(): boolean {
    const navegador = navigator as NavigatorComSerial;

    return !!navegador.serial;
  }

  // =========================================================
  // Verificar se existe porta Serial autorizada
  // =========================================================

  async possuiPortaSerialAutorizada(configuracao: IndicadorPesoConfiguracao): Promise<boolean> {
    if (configuracao.comunicacao.tipo !== 'SERIAL') {
      return false;
    }

    const navegador = navigator as NavigatorComSerial;

    if (!navegador.serial) {
      return false;
    }

    /*
     * Se já existe uma porta associada ao indicador
     * nesta sessão, consideramos a vinculação válida.
     */
    const portaAssociada = this.portasSeriais.get(configuracao.id);

    if (portaAssociada) {
      return true;
    }

    /*
     * getPorts() consulta somente portas que já
     * receberam autorização do usuário.
     *
     * Não abre nenhuma janela.
     */
    const portasAutorizadas = await navegador.serial.getPorts();

    if (portasAutorizadas.length === 0) {
      return false;
    }

    const comunicacao = configuracao.comunicacao;

    // =======================================================
    // Temos Vendor ID / Product ID salvos
    // =======================================================

    if (comunicacao.usbVendorId !== undefined || comunicacao.usbProductId !== undefined) {
      const portasCompativeis = portasAutorizadas.filter((porta) => {
        const info = porta.getInfo();

        const vendorCompativel =
          comunicacao.usbVendorId === undefined || info.usbVendorId === comunicacao.usbVendorId;

        const produtoCompativel =
          comunicacao.usbProductId === undefined || info.usbProductId === comunicacao.usbProductId;

        return vendorCompativel && produtoCompativel;
      });

      return portasCompativeis.length === 1;
    }

    // =======================================================
    // Cenário atual: apenas uma porta autorizada
    // =======================================================

    return portasAutorizadas.length === 1;
  }
  // =========================================================
  // Autorizar porta Serial
  // =========================================================

  async autorizarPortaSerial(
    configuracao: IndicadorPesoConfiguracao,
  ): Promise<ResultadoAutorizacaoSerial> {
    if (configuracao.comunicacao.tipo !== 'SERIAL') {
      throw new Error('O indicador não está configurado para comunicação serial.');
    }

    const navegador = navigator as NavigatorComSerial;

    if (!navegador.serial) {
      throw new Error('Este navegador não oferece suporte à Web Serial.');
    }

    /*
     * requestPort() abre a janela nativa do navegador.
     *
     * Deve ser utilizado apenas durante a
     * autorização/configuração da estação.
     */
    const porta = await navegador.serial.requestPort();

    const info = porta.getInfo();

    /*
     * Guardamos temporariamente a associação
     * da porta com o indicador nesta sessão.
     */
    this.portasSeriais.set(configuracao.id, porta);

    return {
      usbVendorId: info.usbVendorId,

      usbProductId: info.usbProductId,
    };
  }

  // =========================================================
  // Conectar indicador
  // =========================================================

  async conectarIndicador(
    configuracao: IndicadorPesoConfiguracao,
    finalidade: FinalidadeConexaoIndicador,
  ): Promise<void> {
    this.registrarIndicador(configuracao);

    if (!configuracao.ativo) {
      this.atualizarEstado(configuracao.id, {
        conectado: false,
        conectando: false,
        finalidadeConexao: null,
        mensagem: 'Indicador desativado.',
      });

      return;
    }

    if (configuracao.comunicacao.tipo === 'TCP_IP') {
      this.atualizarEstado(configuracao.id, {
        conectado: false,
        conectando: false,
        finalidadeConexao: null,
        mensagem: 'Comunicação TCP/IP ainda não implementada.',
      });

      return;
    }

    await this.conectarSerial(configuracao, finalidade);
  }

  // =========================================================
  // Conexão Serial
  // =========================================================

  private async conectarSerial(
    configuracao: IndicadorPesoConfiguracao,
    finalidade: FinalidadeConexaoIndicador,
  ): Promise<void> {
    const comunicacao = configuracao.comunicacao;

    if (comunicacao.tipo !== 'SERIAL') {
      return;
    }

    const navegador = navigator as NavigatorComSerial;

    if (!navegador.serial) {
      this.atualizarEstado(configuracao.id, {
        conectado: false,
        conectando: false,
        finalidadeConexao: null,
        mensagem: 'Este navegador não oferece suporte à Web Serial.',
      });

      return;
    }

    const estadoAtual = this.obterEstadoAtual(configuracao.id);

    // =======================================================
    // Já existe uma conexão ativa
    // =======================================================

    if (estadoAtual.conectado) {
      /*
       * Se já estiver conectado com a mesma
       * finalidade, não precisamos fazer nada.
       */
      if (estadoAtual.finalidadeConexao === finalidade) {
        return;
      }

      /*
       * Não transformamos silenciosamente uma
       * conexão de TESTE em OPERACIONAL, nem o
       * contrário.
       */
      this.atualizarEstado(configuracao.id, {
        mensagem:
          estadoAtual.finalidadeConexao === 'TESTE'
            ? 'O indicador já está conectado em modo de teste.'
            : 'O indicador já está conectado em modo operacional.',
      });

      return;
    }

    // =======================================================
    // Início da conexão
    // =======================================================

    this.atualizarEstado(configuracao.id, {
      conectado: false,
      conectando: true,
      finalidadeConexao: finalidade,
      mensagem: 'Procurando porta serial autorizada...',
    });

    try {
      const porta = await this.localizarPortaSerial(configuracao);

      if (!porta) {
        this.atualizarEstado(configuracao.id, {
          conectado: false,
          conectando: false,
          finalidadeConexao: null,
          mensagem: 'Nenhuma porta serial autorizada foi encontrada para este indicador.',
        });

        return;
      }

      if (this.portasEmUso.has(porta)) {
        this.atualizarEstado(configuracao.id, {
          conectado: false,
          conectando: false,
          finalidadeConexao: null,
          mensagem: 'A porta serial selecionada já está sendo utilizada por outro indicador.',
        });

        return;
      }

      // =====================================================
      // Abre a porta com os parâmetros configurados
      // =====================================================

      await porta.open({
        baudRate: comunicacao.velocidadeSerial,

        dataBits: comunicacao.bitsDados as 7 | 8,

        stopBits: comunicacao.bitsParada as 1 | 2,

        parity: this.mapearParidade(comunicacao),

        flowControl: this.mapearControleFluxo(comunicacao),
      });

      // =====================================================
      // Registra a conexão
      // =====================================================

      this.portasSeriais.set(configuracao.id, porta);

      this.portasEmUso.add(porta);

      this.buffersSeriais.set(configuracao.id, '');

      // =====================================================
      // Conectado
      // =====================================================

      this.atualizarEstado(configuracao.id, {
        conectado: true,
        conectando: false,
        finalidadeConexao: finalidade,
        mensagem:
          finalidade === 'TESTE'
            ? 'Indicador conectado em modo de teste. Aguardando dados...'
            : 'Indicador conectado em modo operacional. Aguardando dados...',
      });

      // =====================================================
      // Inicia leitura contínua
      // =====================================================

      void this.lerDadosSerial(configuracao.id, porta);
    } catch (erro) {
      console.error(`Erro ao conectar o indicador ${configuracao.id}:`, erro);

      this.atualizarEstado(configuracao.id, {
        conectado: false,
        conectando: false,
        finalidadeConexao: null,
        mensagem: 'Não foi possível abrir a porta serial.',
      });
    }
  }

  // =========================================================
  // Localizar porta Serial já autorizada
  // =========================================================

  private async localizarPortaSerial(
    configuracao: IndicadorPesoConfiguracao,
  ): Promise<SerialPortLocal | null> {
    const comunicacao = configuracao.comunicacao;

    if (comunicacao.tipo !== 'SERIAL') {
      return null;
    }

    // =======================================================
    // Associação já existente nesta sessão
    // =======================================================

    const portaAssociada = this.portasSeriais.get(configuracao.id);

    if (portaAssociada) {
      return portaAssociada;
    }

    // =======================================================
    // Portas autorizadas pelo navegador
    // =======================================================

    const navegador = navigator as NavigatorComSerial;

    if (!navegador.serial) {
      return null;
    }

    /*
     * getPorts() não abre a caixa de diálogo.
     */
    const portasAutorizadas = await navegador.serial.getPorts();

    if (portasAutorizadas.length === 0) {
      return null;
    }

    // =======================================================
    // Procura por Vendor ID / Product ID
    // =======================================================

    if (comunicacao.usbVendorId !== undefined || comunicacao.usbProductId !== undefined) {
      const portasCompativeis = portasAutorizadas.filter((porta) => {
        const info = porta.getInfo();

        const vendorCompativel =
          comunicacao.usbVendorId === undefined || info.usbVendorId === comunicacao.usbVendorId;

        const produtoCompativel =
          comunicacao.usbProductId === undefined || info.usbProductId === comunicacao.usbProductId;

        return vendorCompativel && produtoCompativel;
      });

      /*
       * Para uma conexão automática segura,
       * precisamos identificar exatamente
       * uma porta.
       */
      if (portasCompativeis.length === 1) {
        return portasCompativeis[0];
      }

      return null;
    }

    // =======================================================
    // Cenário com somente uma porta autorizada
    // =======================================================

    if (portasAutorizadas.length === 1) {
      return portasAutorizadas[0];
    }

    /*
     * Se houver várias portas e não tivermos
     * identificação suficiente, não escolhemos
     * uma arbitrariamente.
     */
    return null;
  }

  // =========================================================
  // Leitura contínua da Serial
  // =========================================================

  private async lerDadosSerial(idIndicador: string, porta: SerialPortLocal): Promise<void> {
    if (!porta.readable) {
      return;
    }

    const reader = porta.readable.getReader();

    this.leitoresSeriais.set(idIndicador, reader);

    const decoder = new TextDecoder();

    try {
      while (this.obterEstadoAtual(idIndicador).conectado) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        if (!value) {
          continue;
        }

        const texto = decoder.decode(value, {
          stream: true,
        });

        if (!texto) {
          continue;
        }

        // ===================================================
        // Buffer independente por indicador
        // ===================================================

        let buffer = this.buffersSeriais.get(idIndicador) ?? '';

        buffer += texto;

        if (buffer.length > 500) {
          buffer = buffer.slice(-500);
        }

        this.buffersSeriais.set(idIndicador, buffer);

        // ===================================================
        // Registra leitura bruta
        // ===================================================

        const leitura = this.interpretarLeitura(buffer);

        this.atualizarLeitura(idIndicador, leitura);

        this.atualizarEstado(idIndicador, {
          mensagem: 'Dados recebidos do indicador.',
        });
      }
    } catch (erro) {
      const estado = this.obterEstadoAtual(idIndicador);

      if (estado.conectado) {
        console.error(`Erro na leitura do indicador ${idIndicador}:`, erro);

        this.atualizarEstado(idIndicador, {
          conectado: false,
          conectando: false,
          finalidadeConexao: null,
          mensagem: 'A comunicação com o indicador foi interrompida.',
        });
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // O lock pode já ter sido liberado.
      }

      this.leitoresSeriais.delete(idIndicador);
    }
  }

  // =========================================================
  // Interpretação dos dados do indicador
  // =========================================================

  private interpretarLeitura(dados: string): LeituraIndicadorPeso {
    /*
     * Formato identificado no indicador:
     *
     * PB:   1000kg PL:   1000kg T:      0kg
     *
     * PB = Peso Bruto
     * PL = Peso Líquido
     * T  = Tara
     */

    const regex =
      /PB:\s*([+-]?\d+(?:[.,]\d+)?)\s*kg\s*PL:\s*([+-]?\d+(?:[.,]\d+)?)\s*kg\s*T:\s*([+-]?\d+(?:[.,]\d+)?)\s*kg/gi;

    let resultado: RegExpExecArray | null;

    let ultimoResultado: RegExpExecArray | null = null;

    /*
     * O indicador envia dados continuamente.
     * Procuramos sempre a última mensagem completa.
     */
    while ((resultado = regex.exec(dados)) !== null) {
      ultimoResultado = resultado;
    }

    /*
     * Pode acontecer de uma mensagem serial
     * chegar quebrada em vários pacotes.
     */
    if (!ultimoResultado) {
      return {
        dadoBruto: dados,

        pesoBruto: null,

        pesoLiquido: null,

        tara: null,

        dataHora: new Date(),
      };
    }

    const pesoBruto = this.converterPeso(ultimoResultado[1]);

    const pesoLiquido = this.converterPeso(ultimoResultado[2]);

    const tara = this.converterPeso(ultimoResultado[3]);

    return {
      dadoBruto: ultimoResultado[0].trim(),

      pesoBruto,

      pesoLiquido,

      tara,

      dataHora: new Date(),
    };
  }

  // =========================================================
  // Conversão numérica do peso
  // =========================================================

  private converterPeso(valor: string): number | null {
    const valorNormalizado = valor.trim().replace(',', '.');

    const peso = Number(valorNormalizado);

    if (Number.isNaN(peso)) {
      return null;
    }

    return peso;
  }

  // =========================================================
  // Desconectar indicador
  // =========================================================

  async desconectarIndicador(idIndicador: string): Promise<void> {
    const estadoAtual = this.obterEstadoAtual(idIndicador);

    /*
     * Se não existe conexão ou tentativa
     * de conexão, não há o que fechar.
     */
    if (!estadoAtual.conectado && !estadoAtual.conectando) {
      this.atualizarEstado(idIndicador, {
        finalidadeConexao: null,
        mensagem: 'Indicador desconectado.',
      });

      return;
    }

    // =======================================================
    // Interrompe o loop de leitura
    // =======================================================

    this.atualizarEstado(idIndicador, {
      conectado: false,
      conectando: false,
      mensagem: 'Desconectando indicador...',
    });

    // =======================================================
    // Reader
    // =======================================================

    const reader = this.leitoresSeriais.get(idIndicador);

    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // Reader pode já estar encerrado.
      }

      try {
        reader.releaseLock();
      } catch {
        // Lock pode já estar liberado.
      }

      this.leitoresSeriais.delete(idIndicador);
    }

    // =======================================================
    // Porta
    // =======================================================

    const porta = this.portasSeriais.get(idIndicador);

    if (porta) {
      try {
        await porta.close();
      } catch {
        // Porta pode já estar fechada.
      }

      this.portasEmUso.delete(porta);

      this.portasSeriais.delete(idIndicador);
    }

    this.buffersSeriais.delete(idIndicador);

    // =======================================================
    // Estado final
    // =======================================================

    this.atualizarEstado(idIndicador, {
      conectado: false,
      conectando: false,
      finalidadeConexao: null,
      mensagem: 'Indicador desconectado.',
    });
  }

  // =========================================================
  // Desconectar somente se for TESTE
  // =========================================================

  async desconectarTeste(idIndicador: string): Promise<void> {
    const estado = this.obterEstadoAtual(idIndicador);

    /*
     * Segurança:
     *
     * este método nunca deve derrubar uma
     * conexão operacional.
     */
    if (estado.finalidadeConexao !== 'TESTE') {
      return;
    }

    await this.desconectarIndicador(idIndicador);
  }

  // =========================================================
  // Verificar conexão operacional
  // =========================================================

  possuiConexaoOperacional(idIndicador: string): boolean {
    const estado = this.obterEstadoAtual(idIndicador);

    return estado.finalidadeConexao === 'OPERACIONAL' && (estado.conectado || estado.conectando);
  }

  // =========================================================
  // Desconectar somente se for OPERACIONAL
  // =========================================================

  async desconectarOperacional(idIndicador: string): Promise<void> {
    const estado = this.obterEstadoAtual(idIndicador);

    /*
     * Segurança:
     *
     * este método nunca deve derrubar
     * uma conexão de TESTE.
     */
    if (estado.finalidadeConexao !== 'OPERACIONAL') {
      return;
    }

    await this.desconectarIndicador(idIndicador);
  }

  // =========================================================
  // Conversões Web Serial
  // =========================================================

  private mapearParidade(configuracao: ConfiguracaoSerialIndicador): ParidadeWebSerial {
    switch (configuracao.paridade) {
      case 'EVEN':
        return 'even';

      case 'ODD':
        return 'odd';

      default:
        return 'none';
    }
  }

  private mapearControleFluxo(configuracao: ConfiguracaoSerialIndicador): ControleFluxoWebSerial {
    if (configuracao.controleFluxo === 'RTS_CTS') {
      return 'hardware';
    }

    return 'none';
  }

  // =========================================================
  // Controle dos estados
  // =========================================================

  private obterOuCriarEstado(idIndicador: string): BehaviorSubject<EstadoIndicadorPeso> {
    const existente = this.estados.get(idIndicador);

    if (existente) {
      return existente;
    }

    const novoEstado = new BehaviorSubject<EstadoIndicadorPeso>(
      this.criarEstadoInicial(idIndicador),
    );

    this.estados.set(idIndicador, novoEstado);

    return novoEstado;
  }

  private criarEstadoInicial(idIndicador: string): EstadoIndicadorPeso {
    return {
      idIndicador,

      conectado: false,

      conectando: false,

      finalidadeConexao: null,

      mensagem: 'Indicador desconectado.',

      leitura: {
        dadoBruto: '',

        pesoBruto: null,

        pesoLiquido: null,

        tara: null,

        dataHora: null,
      },
    };
  }

  private atualizarEstado(
    idIndicador: string,

    alteracoes: Partial<Omit<EstadoIndicadorPeso, 'idIndicador' | 'leitura'>>,
  ): void {
    const subject = this.obterOuCriarEstado(idIndicador);

    const estadoAtual = subject.value;

    subject.next({
      ...estadoAtual,
      ...alteracoes,
    });
  }

  private atualizarLeitura(idIndicador: string, leitura: LeituraIndicadorPeso): void {
    const subject = this.obterOuCriarEstado(idIndicador);

    subject.next({
      ...subject.value,
      leitura,
    });
  }
}
