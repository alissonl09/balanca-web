import { CommonModule } from '@angular/common';

import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Subscription } from 'rxjs';

import { ConfiguracaoGeralService } from '../../services/configuracao-geral.service';

import { ModeloIndicadorService } from '../../services/modelo-indicador.service';

import { IndicadorPesoService } from '../../services/indicador-peso.service';

import { ModeloIndicador } from '../../models/modelo-indicador.model';

import {
  ControleFluxoSerial,
  IndicadorPesoConfiguracao,
  ModoTcp,
  ParidadeSerial,
  TipoComunicacaoIndicador,
} from '../../models/indicador.model';

import { ModelosIndicadores } from './modelos-indicadores/modelos-indicadores';

type AbaConfiguracoes = 'GERAIS' | 'INDICADORES' | 'MODELOS';

@Component({
  selector: 'app-configuracoes',

  standalone: true,

  imports: [CommonModule, FormsModule, ModelosIndicadores],

  templateUrl: './configuracoes.html',

  styleUrl: './configuracoes.css',
})
export class Configuracoes implements OnInit, OnDestroy {
  // =========================================================
  // Identificação do indicador
  // =========================================================

  private readonly idIndicador = 'indicador-principal';

  private readonly nomeIndicador = 'Indicador principal';

  // =========================================================
  // Persistência temporária
  // =========================================================

  private readonly storageKeyIndicador = 'balanca-configuracao-indicador';

  // =========================================================
  // Navegação das configurações
  // =========================================================

  abaSelecionada: AbaConfiguracoes = 'GERAIS';

  get abaGeraisSelecionada(): boolean {
    return this.abaSelecionada === 'GERAIS';
  }

  get abaIndicadoresSelecionada(): boolean {
    return this.abaSelecionada === 'INDICADORES';
  }

  get abaModelosSelecionada(): boolean {
    return this.abaSelecionada === 'MODELOS';
  }

  // =========================================================
  // Configurações Gerais
  // =========================================================

  codigoUnidadeBalanca: number | null = null;

  mensagemConfiguracaoGeral = '';

  tipoMensagemConfiguracaoGeral: 'sucesso' | 'erro' | '' = '';

  // =========================================================
  // Catálogo de modelos
  // =========================================================

  modelosIndicadores: ModeloIndicador[] = [];

  private modelosIndicadoresSubscription: Subscription | null = null;

  // =========================================================
  // Modelo selecionado
  // =========================================================

  modeloIndicador = '';

  // =========================================================
  // Tipo de comunicação
  // =========================================================

  tipoComunicacao: TipoComunicacaoIndicador = 'SERIAL';

  get comunicacaoSerialSelecionada(): boolean {
    return this.tipoComunicacao === 'SERIAL';
  }

  get comunicacaoTcpSelecionada(): boolean {
    return this.tipoComunicacao === 'TCP_IP';
  }

  // =========================================================
  // Configuração Serial
  // =========================================================

  portasSeriais: string[] = Array.from(
    {
      length: 15,
    },
    (_, indice) => `COM${indice + 1}`,
  );

  portaSerial = '';

  velocidadeSerial = 4800;

  bitsDados = 7;

  paridade: ParidadeSerial = 'EVEN';

  bitsParada = 2;

  controleFluxo: ControleFluxoSerial = 'NONE';

  portaSerialAutorizada = false;

  /*
   * Identificação física do dispositivo
   * autorizado pelo Web Serial.
   */
  private usbVendorId: number | undefined;

  private usbProductId: number | undefined;

  // =========================================================
  // Resumo da configuração Serial
  // =========================================================

  get resumoConfiguracaoSerial(): string {
    const paridades: Record<ParidadeSerial, string> = {
      NONE: 'N',

      EVEN: 'E',

      ODD: 'O',
    };

    const controlesFluxo: Record<ControleFluxoSerial, string> = {
      NONE: 'Nenhum',

      RTS_CTS: 'RTS/CTS',

      XON_XOFF: 'XON/XOFF',
    };

    return (
      `${this.velocidadeSerial}, ` +
      `${paridades[this.paridade]}, ` +
      `${this.bitsDados}, ` +
      `${this.bitsParada}, ` +
      `${controlesFluxo[this.controleFluxo]}`
    );
  }

  // =========================================================
  // Configuração TCP/IP
  // =========================================================

  modoTcp: ModoTcp = 'CLIENT';

  enderecoIp = '';

  portaTcp: number | null = null;

  timeoutTcp = 10;

  reconexaoAutomatica = true;

  // =========================================================
  // Teste da comunicação
  // =========================================================

  testandoComunicacao = false;

  comunicacaoConectada = false;

  mensagemTesteComunicacao = '';

  ultimoDadoRecebido = '';

  pesoInterpretado: number | null = null;

  // =========================================================
  // Mensagens
  // =========================================================

  mensagemConfiguracao = '';

  tipoMensagemConfiguracao: 'sucesso' | 'erro' | '' = '';

  // =========================================================
  // Subscription do indicador
  // =========================================================

  private estadoIndicadorSubscription: Subscription | null = null;

  // =========================================================
  // Constructor
  // =========================================================

  constructor(
    private readonly configuracaoGeralService: ConfiguracaoGeralService,

    private readonly indicadorPesoService: IndicadorPesoService,

    private readonly modeloIndicadorService: ModeloIndicadorService,
  ) {}

  // =========================================================
  // Inicialização
  // =========================================================

  ngOnInit(): void {
    // -------------------------------------------------------
    // Configuração salva
    // -------------------------------------------------------

    this.carregarConfiguracao();

    // -------------------------------------------------------
    // Configurações Gerais
    // -------------------------------------------------------

    const configuracaoGeral = this.configuracaoGeralService.obterConfiguracaoAtual();

    this.codigoUnidadeBalanca = configuracaoGeral.codigoUnidadeBalanca;

    // -------------------------------------------------------
    // Catálogo de modelos
    // -------------------------------------------------------

    this.modelosIndicadoresSubscription = this.modeloIndicadorService.modelos$.subscribe(
      (modelos) => {
        this.modelosIndicadores = modelos.filter((modelo) => modelo.ativo);

        this.normalizarModeloIndicadorSalvo();
      },
    );

    // -------------------------------------------------------
    // Autorização Serial
    // -------------------------------------------------------

    void this.verificarPortaSerialAutorizada();

    // -------------------------------------------------------
    // Estado do indicador
    // -------------------------------------------------------

    this.estadoIndicadorSubscription = this.indicadorPesoService
      .obterEstado$(this.idIndicador)
      .subscribe((estado) => {
        const testeConectando = estado.conectando && estado.finalidadeConexao === 'TESTE';

        const testeConectado = estado.conectado && estado.finalidadeConexao === 'TESTE';

        this.testandoComunicacao = testeConectando;

        this.comunicacaoConectada = testeConectado;

        if (estado.finalidadeConexao === 'TESTE' || testeConectando || testeConectado) {
          this.mensagemTesteComunicacao = estado.mensagem;
        }

        if (testeConectado) {
          this.ultimoDadoRecebido = estado.leitura.dadoBruto ?? '';

          this.pesoInterpretado = estado.leitura.pesoBruto;
        }
      });
  }

  // =========================================================
  // Destruição
  // =========================================================

  ngOnDestroy(): void {
    this.estadoIndicadorSubscription?.unsubscribe();

    this.estadoIndicadorSubscription = null;

    this.modelosIndicadoresSubscription?.unsubscribe();

    this.modelosIndicadoresSubscription = null;
  }

  // =========================================================
  // Navegação entre abas
  // =========================================================

  async selecionarAba(aba: AbaConfiguracoes): Promise<void> {
    if (this.abaSelecionada === aba) {
      return;
    }

    if (
      this.abaSelecionada === 'INDICADORES' &&
      this.indicadorPesoService.possuiTesteAtivo(this.idIndicador)
    ) {
      const desejaTrocar = window.confirm(
        'Existe um teste de comunicação ativo com o indicador.\n\n' +
          'Ao acessar outra configuração, o teste será desconectado.\n\n' +
          'Deseja desconectar o teste e continuar?',
      );

      if (!desejaTrocar) {
        return;
      }

      await this.indicadorPesoService.desconectarTeste(this.idIndicador);
    }

    this.abaSelecionada = aba;

    this.limparMensagem();

    this.mensagemTesteComunicacao = '';
  }

  // =========================================================
  // Seleção do modelo
  // =========================================================

  selecionarModeloIndicador(idModelo: string): void {
    this.modeloIndicador = idModelo;

    this.limparMensagem();

    if (!idModelo) {
      return;
    }

    const modelo = this.modeloIndicadorService.obterPorId(idModelo);

    if (!modelo) {
      return;
    }

    // -------------------------------------------------------
    // Comunicação não suportada
    // -------------------------------------------------------

    if (this.comunicacaoSerialSelecionada && !modelo.suportaSerial && modelo.suportaTcpIp) {
      this.tipoComunicacao = 'TCP_IP';

      this.portaSerialAutorizada = false;
    }

    if (this.comunicacaoTcpSelecionada && !modelo.suportaTcpIp && modelo.suportaSerial) {
      this.tipoComunicacao = 'SERIAL';

      void this.verificarPortaSerialAutorizada();
    }

    // -------------------------------------------------------
    // Parâmetros definidos no modelo
    // -------------------------------------------------------

    this.aplicarConfiguracaoSerialPadraoModelo();
  }

  // =========================================================
  // Aplicar configuração Serial definida no modelo
  // =========================================================

  private aplicarConfiguracaoSerialPadraoModelo(): void {
    if (!this.modeloIndicador) {
      return;
    }

    const modelo = this.modeloIndicadorService.obterPorId(this.modeloIndicador);

    if (!modelo || !modelo.suportaSerial || !modelo.configuracaoSerialPadrao) {
      return;
    }

    const serial = modelo.configuracaoSerialPadrao;

    this.velocidadeSerial = serial.velocidadeSerial;

    this.bitsDados = serial.bitsDados;

    this.paridade = serial.paridade;

    this.bitsParada = serial.bitsParada;

    this.controleFluxo = serial.controleFluxo;
  }

  // =========================================================
  // Seleção da comunicação
  // =========================================================

  selecionarComunicacao(tipo: TipoComunicacaoIndicador): void {
    if (this.tipoComunicacao === tipo) {
      return;
    }

    this.tipoComunicacao = tipo;

    this.limparMensagem();

    if (tipo === 'TCP_IP') {
      this.portaSerialAutorizada = false;

      return;
    }

    /*
     * Ao selecionar Serial, garantimos que
     * os parâmetros estejam iguais aos
     * definidos no modelo.
     */
    this.aplicarConfiguracaoSerialPadraoModelo();

    void this.verificarPortaSerialAutorizada();
  }

  // =========================================================
  // Autorizar dispositivo Serial
  // =========================================================

  async autorizarPortaSerial(): Promise<void> {
    this.limparMensagem();

    if (!this.comunicacaoSerialSelecionada) {
      this.definirMensagemConfiguracao('Selecione a comunicação Serial / RS-232.', 'erro');

      return;
    }

    if (!this.portaSerial) {
      this.definirMensagemConfiguracao('Selecione a porta COM.', 'erro');

      return;
    }

    const configuracao = this.criarConfiguracaoAtual();

    try {
      const resultado = await this.indicadorPesoService.autorizarPortaSerial(configuracao);

      this.usbVendorId = resultado.usbVendorId;

      this.usbProductId = resultado.usbProductId;

      this.portaSerialAutorizada = true;

      const configuracaoAtualizada = this.criarConfiguracaoAtual();

      localStorage.setItem(this.storageKeyIndicador, JSON.stringify(configuracaoAtualizada));

      this.definirMensagemConfiguracao('Dispositivo Serial autorizado com sucesso.', 'sucesso');
    } catch (erro) {
      console.error('Erro ao autorizar dispositivo Serial:', erro);

      this.portaSerialAutorizada = false;

      const mensagem =
        erro instanceof Error ? erro.message : 'Não foi possível autorizar o dispositivo Serial.';

      this.definirMensagemConfiguracao(mensagem, 'erro');
    }
  }

  // =========================================================
  // Verificar autorização Serial
  // =========================================================

  private async verificarPortaSerialAutorizada(): Promise<void> {
    if (!this.comunicacaoSerialSelecionada) {
      this.portaSerialAutorizada = false;

      return;
    }

    if (!this.portaSerial) {
      this.portaSerialAutorizada = false;

      return;
    }

    try {
      const configuracao = this.criarConfiguracaoAtual();

      this.portaSerialAutorizada =
        await this.indicadorPesoService.possuiPortaSerialAutorizada(configuracao);
    } catch (erro) {
      console.error('Erro ao verificar autorização da porta Serial:', erro);

      this.portaSerialAutorizada = false;
    }
  }

  // =========================================================
  // Testar comunicação
  // =========================================================

  async testarComunicacao(): Promise<void> {
    this.limparMensagem();

    if (this.indicadorPesoService.possuiTesteAtivo(this.idIndicador)) {
      await this.indicadorPesoService.desconectarTeste(this.idIndicador);

      this.ultimoDadoRecebido = '';

      this.pesoInterpretado = null;

      return;
    }

    const mensagemValidacao = this.validarConfiguracao();

    if (mensagemValidacao) {
      this.mensagemTesteComunicacao = mensagemValidacao;

      return;
    }

    const configuracao = this.criarConfiguracaoAtual();

    this.ultimoDadoRecebido = '';

    this.pesoInterpretado = null;

    try {
      await this.indicadorPesoService.conectarIndicador(configuracao, 'TESTE');
    } catch (erro) {
      console.error('Erro ao testar comunicação:', erro);

      this.mensagemTesteComunicacao =
        erro instanceof Error ? erro.message : 'Não foi possível iniciar o teste de comunicação.';
    }
  }

  // =========================================================
  // Salvar Configurações Gerais
  // =========================================================

  salvarConfiguracoesGerais(): void {
    this.mensagemConfiguracaoGeral = '';

    this.tipoMensagemConfiguracaoGeral = '';

    try {
      this.configuracaoGeralService.salvar({
        codigoUnidadeBalanca: this.codigoUnidadeBalanca,
      });

      this.mensagemConfiguracaoGeral = 'Configurações gerais salvas com sucesso.';

      this.tipoMensagemConfiguracaoGeral = 'sucesso';
    } catch (erro) {
      const mensagem =
        erro instanceof Error ? erro.message : 'Não foi possível salvar as configurações gerais.';

      this.mensagemConfiguracaoGeral = mensagem;

      this.tipoMensagemConfiguracaoGeral = 'erro';
    }
  }

  // =========================================================
  // Salvar configuração
  // =========================================================

  salvarConfiguracoes(): void {
    this.limparMensagem();

    /*
     * Antes de salvar uma configuração Serial,
     * garantimos novamente que os parâmetros
     * utilizados sejam os definidos no modelo.
     */
    if (this.comunicacaoSerialSelecionada) {
      this.aplicarConfiguracaoSerialPadraoModelo();
    }

    const mensagemValidacao = this.validarConfiguracao();

    if (mensagemValidacao) {
      this.definirMensagemConfiguracao(mensagemValidacao, 'erro');

      return;
    }

    const configuracao = this.criarConfiguracaoAtual();

    try {
      localStorage.setItem(this.storageKeyIndicador, JSON.stringify(configuracao));

      this.definirMensagemConfiguracao('Configurações salvas com sucesso.', 'sucesso');
    } catch (erro) {
      console.error('Erro ao salvar configuração do indicador:', erro);

      this.definirMensagemConfiguracao('Não foi possível salvar as configurações.', 'erro');
    }
  }

  // =========================================================
  // Criar configuração atual
  // =========================================================

  private criarConfiguracaoAtual(): IndicadorPesoConfiguracao {
    // -------------------------------------------------------
    // Serial
    // -------------------------------------------------------

    if (this.comunicacaoSerialSelecionada) {
      return {
        id: this.idIndicador,

        nome: this.nomeIndicador,

        modelo: this.modeloIndicador,

        ativo: true,

        comunicacao: {
          tipo: 'SERIAL',

          portaSerial: this.portaSerial,

          velocidadeSerial: this.velocidadeSerial,

          bitsDados: this.bitsDados,

          paridade: this.paridade,

          bitsParada: this.bitsParada,

          controleFluxo: this.controleFluxo,

          usbVendorId: this.usbVendorId,

          usbProductId: this.usbProductId,
        },
      };
    }

    // -------------------------------------------------------
    // TCP/IP
    // -------------------------------------------------------

    return {
      id: this.idIndicador,

      nome: this.nomeIndicador,

      modelo: this.modeloIndicador,

      ativo: true,

      comunicacao: {
        tipo: 'TCP_IP',

        modoTcp: this.modoTcp,

        enderecoIp: this.enderecoIp.trim(),

        portaTcp: this.portaTcp,

        timeoutTcp: this.timeoutTcp,

        reconexaoAutomatica: this.reconexaoAutomatica,
      },
    };
  }

  // =========================================================
  // Validação
  // =========================================================

  private validarConfiguracao(): string | null {
    if (!this.modeloIndicador.trim()) {
      return 'Selecione o modelo do indicador.';
    }

    const modelo = this.modeloIndicadorService.obterPorId(this.modeloIndicador);

    if (!modelo) {
      return 'O modelo selecionado não foi encontrado no cadastro.';
    }

    // -------------------------------------------------------
    // Serial
    // -------------------------------------------------------

    if (this.comunicacaoSerialSelecionada) {
      if (!modelo.suportaSerial) {
        return 'O modelo selecionado não suporta comunicação Serial.';
      }

      if (!modelo.configuracaoSerialPadrao) {
        return 'O modelo selecionado não possui parâmetros Serial configurados.';
      }

      if (!this.portaSerial) {
        return 'Selecione a porta COM.';
      }

      return null;
    }

    // -------------------------------------------------------
    // TCP/IP
    // -------------------------------------------------------

    if (!modelo.suportaTcpIp) {
      return 'O modelo selecionado não suporta comunicação TCP/IP.';
    }

    if (!this.enderecoIp.trim()) {
      return 'Informe o endereço IP do indicador.';
    }

    if (this.portaTcp === null || this.portaTcp < 1 || this.portaTcp > 65535) {
      return 'Informe uma porta TCP válida entre 1 e 65535.';
    }

    if (!this.timeoutTcp || this.timeoutTcp <= 0) {
      return 'Informe um timeout TCP válido.';
    }

    return null;
  }

  // =========================================================
  // Carregar configuração salva
  // =========================================================

  private carregarConfiguracao(): void {
    const dados = localStorage.getItem(this.storageKeyIndicador);

    if (!dados) {
      return;
    }

    try {
      const configuracao = JSON.parse(dados) as IndicadorPesoConfiguracao;

      if (!configuracao || !configuracao.comunicacao) {
        return;
      }

      this.modeloIndicador = configuracao.modelo ?? '';

      // -----------------------------------------------------
      // Serial
      // -----------------------------------------------------

      if (configuracao.comunicacao.tipo === 'SERIAL') {
        const serial = configuracao.comunicacao;

        this.tipoComunicacao = 'SERIAL';

        this.portaSerial = serial.portaSerial ?? '';

        this.velocidadeSerial = serial.velocidadeSerial ?? 4800;

        this.bitsDados = serial.bitsDados ?? 7;

        this.paridade = serial.paridade ?? 'EVEN';

        this.bitsParada = serial.bitsParada ?? 2;

        this.controleFluxo = serial.controleFluxo ?? 'NONE';

        this.usbVendorId = serial.usbVendorId;

        this.usbProductId = serial.usbProductId;

        return;
      }

      // -----------------------------------------------------
      // TCP/IP
      // -----------------------------------------------------

      const tcp = configuracao.comunicacao;

      this.tipoComunicacao = 'TCP_IP';

      this.modoTcp = tcp.modoTcp ?? 'CLIENT';

      this.enderecoIp = tcp.enderecoIp ?? '';

      this.portaTcp = tcp.portaTcp ?? null;

      this.timeoutTcp = tcp.timeoutTcp ?? 10;

      this.reconexaoAutomatica = tcp.reconexaoAutomatica ?? true;
    } catch (erro) {
      console.error('Erro ao carregar configuração do indicador:', erro);
    }
  }

  // =========================================================
  // Compatibilidade com modelos antigos
  // =========================================================

  private normalizarModeloIndicadorSalvo(): void {
    if (!this.modeloIndicador) {
      return;
    }

    const modelosLegados: Record<string, string> = {
      ALFA_3101C: 'alfa-3101-c',
    };

    const modeloConvertido = modelosLegados[this.modeloIndicador];

    if (!modeloConvertido) {
      return;
    }

    const existeNoCatalogo = this.modelosIndicadores.some(
      (modelo) => modelo.id === modeloConvertido,
    );

    if (existeNoCatalogo) {
      this.modeloIndicador = modeloConvertido;

      /*
       * Como o modelo antigo foi convertido,
       * carregamos também os parâmetros
       * cadastrados no catálogo atual.
       */
      this.aplicarConfiguracaoSerialPadraoModelo();
    }
  }

  // =========================================================
  // Proteção ao sair da página
  // =========================================================

  async podeSairDaPagina(): Promise<boolean> {
    if (!this.indicadorPesoService.possuiTesteAtivo(this.idIndicador)) {
      return true;
    }

    const desejaSair = window.confirm(
      'Existe um teste de comunicação ativo com o indicador.\n\n' +
        'Ao sair da tela, o teste será desconectado.\n\n' +
        'Deseja desconectar o teste e continuar?',
    );

    if (!desejaSair) {
      return false;
    }

    await this.indicadorPesoService.desconectarTeste(this.idIndicador);

    return true;
  }

  // =========================================================
  // Proteção ao atualizar / fechar navegador
  // =========================================================

  @HostListener('window:beforeunload', ['$event'])
  protegerAtualizacao(event: BeforeUnloadEvent): void {
    if (!this.indicadorPesoService.possuiTesteAtivo(this.idIndicador)) {
      return;
    }

    event.preventDefault();

    event.returnValue = '';
  }

  // =========================================================
  // Mensagens
  // =========================================================

  private limparMensagem(): void {
    this.mensagemConfiguracao = '';

    this.tipoMensagemConfiguracao = '';
  }

  private definirMensagemConfiguracao(
    mensagem: string,

    tipo: 'sucesso' | 'erro',
  ): void {
    this.mensagemConfiguracao = mensagem;

    this.tipoMensagemConfiguracao = tipo;
  }
}
