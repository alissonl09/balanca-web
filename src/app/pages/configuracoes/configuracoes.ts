import { CommonModule } from '@angular/common';

import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Subscription } from 'rxjs';

import {
  ControleFluxoSerial,
  IndicadorPesoConfiguracao,
  ModoTcp,
  ParidadeSerial,
  TipoComunicacaoIndicador,
} from '../../models/indicador.model';

import { IndicadorPesoService } from '../../services/indicador-peso.service';

// =========================================================
// Modelo antigo salvo no localStorage
//
// Mantemos temporariamente para migrar automaticamente
// a configuração que você já salvou anteriormente.
// =========================================================

interface ConfiguracaoIndicadorLegada {
  tipoComunicacao: TipoComunicacaoIndicador;

  modeloIndicador: string;

  portaSerial?: string;
  velocidadeSerial?: number;
  bitsDados?: number;
  paridade?: ParidadeSerial;
  bitsParada?: number;
  controleFluxo?: ControleFluxoSerial;

  modoTcp?: ModoTcp;
  enderecoIp?: string;
  portaTcp?: number | null;
  timeoutTcp?: number;
  reconexaoAutomatica?: boolean;
}

@Component({
  selector: 'app-configuracoes',
  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.css',
})
export class Configuracoes implements OnInit, OnDestroy {
  // =========================================================
  // Identificação do indicador atual
  // =========================================================

  /*
   * Hoje temos somente um indicador.
   *
   * Futuramente poderemos ter:
   *
   * indicador-principal
   * indicador-entrada
   * indicador-saida
   * etc.
   */
  private readonly idIndicador = 'indicador-principal';

  private readonly nomeIndicador = 'Indicador principal';

  // =========================================================
  // LocalStorage
  // =========================================================

  private readonly storageKey = 'balanca-configuracao-indicador';

  // =========================================================
  // Subscription do estado
  // =========================================================

  private estadoIndicadorSubscription: Subscription | null = null;

  // =========================================================
  // Tipo de comunicação
  // =========================================================

  tipoComunicacao: TipoComunicacaoIndicador = 'SERIAL';

  selecionarComunicacao(tipo: TipoComunicacaoIndicador): void {
    this.tipoComunicacao = tipo;

    if (tipo === 'TCP_IP') {
      this.portaSerialAutorizada = false;
    }

    this.limparMensagem();

    this.mensagemTesteComunicacao = '';
  }

  get comunicacaoSerialSelecionada(): boolean {
    return this.tipoComunicacao === 'SERIAL';
  }

  get comunicacaoTcpSelecionada(): boolean {
    return this.tipoComunicacao === 'TCP_IP';
  }

  // =========================================================
  // Indicador
  // =========================================================

  modeloIndicador = '';

  // =========================================================
  // Serial
  // =========================================================

  portaSerial = '';

  portaSerialAutorizada = false;

  readonly portasSeriais: string[] = Array.from({ length: 15 }, (_, indice) => `COM${indice + 1}`);

  velocidadeSerial = 4800;

  bitsDados = 7;

  paridade: ParidadeSerial = 'EVEN';

  bitsParada = 2;

  controleFluxo: ControleFluxoSerial = 'NONE';

  // =========================================================
  // TCP/IP
  // =========================================================

  modoTcp: ModoTcp = 'CLIENT';

  enderecoIp = '';

  portaTcp: number | null = null;

  timeoutTcp = 5;

  reconexaoAutomatica = true;

  // =========================================================
  // Mensagens da configuração
  // =========================================================

  mensagemConfiguracao = '';

  tipoMensagemConfiguracao: 'sucesso' | 'erro' | '' = '';

  // =========================================================
  // Configuração salva
  // =========================================================

  configuracaoSalva: IndicadorPesoConfiguracao | null = null;

  // =========================================================
  // Estado da comunicação
  //
  // Estes campos continuam existindo porque o HTML
  // já utiliza todos eles.
  // =========================================================

  testandoComunicacao = false;

  comunicacaoConectada = false;

  mensagemTesteComunicacao = '';

  ultimoDadoRecebido = '';

  pesoInterpretado: number | null = null;

  // =========================================================
  // Constructor
  // =========================================================

  constructor(private readonly indicadorPesoService: IndicadorPesoService) {}

  // =========================================================
  // Inicialização
  // =========================================================

  ngOnInit(): void {
    this.carregarConfiguracao();

    void this.verificarPortaSerialAutorizada();
    /*
     * A página passa apenas a acompanhar
     * o estado mantido pelo serviço.
     */
    this.estadoIndicadorSubscription = this.indicadorPesoService
      .obterEstado$(this.idIndicador)
      .subscribe((estado) => {
        this.testandoComunicacao = estado.conectando;

        this.comunicacaoConectada = estado.conectado;

        this.mensagemTesteComunicacao = estado.mensagem;

        this.ultimoDadoRecebido = estado.leitura.dadoBruto;

        /*
         * O parser ainda será implementado
         * dentro da camada do indicador.
         */
        this.pesoInterpretado = estado.leitura.pesoBruto;
      });
  }

  // =========================================================
  // Destruição da página
  // =========================================================

  ngOnDestroy(): void {
    /*
     * IMPORTANTE:
     *
     * Aqui NÃO desconectamos mais o indicador.
     *
     * Apenas paramos de observar o estado dele.
     *
     * A conexão pertence ao IndicadorPesoService
     * e poderá continuar ativa quando navegarmos
     * para a tela Pesagem.
     */

    this.estadoIndicadorSubscription?.unsubscribe();
  }

  // =========================================================
  // Salvar configurações
  // =========================================================

  salvarConfiguracoes(): void {
    this.limparMensagem();

    const configuracao = this.criarConfiguracaoAtual('configuracao');

    if (!configuracao) {
      return;
    }

    this.configuracaoSalva = configuracao;

    this.persistirConfiguracao();

    this.indicadorPesoService.registrarIndicador(configuracao);

    this.mostrarMensagem('Configurações salvas com sucesso.', 'sucesso');
  }

  // =========================================================
  // Testar comunicação
  // =========================================================

  async testarComunicacao(): Promise<void> {
    this.mensagemTesteComunicacao = '';

    /*
     * Caso esteja conectado, o mesmo botão
     * funciona como Desconectar.
     */
    if (this.comunicacaoConectada) {
      await this.indicadorPesoService.desconectarIndicador(this.idIndicador);

      return;
    }

    const configuracao = this.criarConfiguracaoAtual('teste');

    if (!configuracao) {
      return;
    }

    /*
     * Aqui NÃO usamos requestPort().
     *
     * Portanto esta ação não deve abrir
     * a janela de seleção do navegador.
     *
     * O serviço tentará localizar uma porta
     * previamente autorizada usando getPorts().
     */
    await this.indicadorPesoService.conectarIndicador(configuracao, 'TESTE');
  }

  // =========================================================
  // Segurança ao sair da tela de Configurações
  // =========================================================

  async podeSairDaPagina(): Promise<boolean> {
    /*
     * Se não existe um teste ativo,
     * pode navegar normalmente.
     */
    if (!this.indicadorPesoService.possuiTesteAtivo(this.idIndicador)) {
      return true;
    }

    /*
     * Existe uma conexão aberta em modo TESTE.
     *
     * Por enquanto utilizamos a confirmação nativa
     * do navegador. Depois podemos substituir por
     * uma modal no padrão visual da aplicação.
     */
    const desejaSair = window.confirm(
      'Existe um teste de comunicação ativo com o indicador.\n\n' +
        'Ao sair da tela, o teste será desconectado.\n\n' +
        'Deseja desconectar o teste e continuar?',
    );

    if (!desejaSair) {
      return false;
    }

    /*
     * O serviço possui uma proteção adicional:
     * desconectarTeste() nunca derruba uma
     * conexão OPERACIONAL.
     */
    await this.indicadorPesoService.desconectarTeste(this.idIndicador);

    return true;
  }

  // =========================================================
  // Segurança ao fechar/recarregar o navegador
  // =========================================================

  @HostListener('window:beforeunload', ['$event'])
  protegerFechamentoNavegador(event: BeforeUnloadEvent): void {
    /*
     * Só mostramos o alerta se existir
     * uma conexão em modo TESTE.
     *
     * Uma conexão OPERACIONAL não deve ser
     * confundida com o teste da tela.
     */
    const testeAtivo = this.indicadorPesoService.possuiTesteAtivo(this.idIndicador);

    if (!testeAtivo) {
      return;
    }

    /*
     * Os navegadores modernos não permitem
     * personalizar a mensagem desta janela.
     *
     * preventDefault + returnValue fazem o
     * navegador apresentar seu aviso padrão.
     */
    event.preventDefault();

    event.returnValue = '';
  }

  // =========================================================
  // Verificar autorização da porta Serial
  // =========================================================

  private async verificarPortaSerialAutorizada(): Promise<void> {
    if (!this.configuracaoSalva || this.configuracaoSalva.comunicacao.tipo !== 'SERIAL') {
      this.portaSerialAutorizada = false;

      return;
    }

    try {
      this.portaSerialAutorizada = await this.indicadorPesoService.possuiPortaSerialAutorizada(
        this.configuracaoSalva,
      );
    } catch (erro) {
      console.error('Erro ao verificar autorização da porta serial:', erro);

      this.portaSerialAutorizada = false;
    }
  }

  // =========================================================
  // Autorizar porta Serial
  //
  // Este método será ligado ao HTML no próximo passo.
  //
  // Somente esta ação poderá abrir a janela nativa
  // do navegador.
  // =========================================================

  async autorizarPortaSerial(): Promise<void> {
    this.limparMensagem();

    this.mensagemTesteComunicacao = '';

    const configuracao = this.criarConfiguracaoAtual('teste');

    if (!configuracao) {
      return;
    }

    if (configuracao.comunicacao.tipo !== 'SERIAL') {
      this.mensagemTesteComunicacao =
        'A autorização de porta é utilizada somente para comunicação Serial.';

      return;
    }

    try {
      const resultado = await this.indicadorPesoService.autorizarPortaSerial(configuracao);

      /*
       * Guardamos Vendor ID e Product ID
       * quando o navegador disponibilizar.
       *
       * Isso ajudará na reconexão automática.
       */
      configuracao.comunicacao.usbVendorId = resultado.usbVendorId;

      configuracao.comunicacao.usbProductId = resultado.usbProductId;

      this.configuracaoSalva = configuracao;

      this.persistirConfiguracao();

      this.portaSerialAutorizada = true;

      this.mostrarMensagem('Porta serial autorizada com sucesso.', 'sucesso');

      this.mensagemTesteComunicacao =
        'Porta autorizada. A conexão poderá ser realizada automaticamente.';
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === 'NotFoundError') {
        this.mensagemTesteComunicacao = 'A seleção da porta serial foi cancelada.';

        return;
      }

      console.error('Erro ao autorizar porta serial:', erro);

      this.mensagemTesteComunicacao = 'Não foi possível autorizar a porta serial.';
    }
  }

  // =========================================================
  // Montagem da configuração atual
  // =========================================================

  private criarConfiguracaoAtual(
    origem: 'configuracao' | 'teste',
  ): IndicadorPesoConfiguracao | null {
    if (!this.modeloIndicador) {
      this.exibirErroValidacao('Selecione o modelo do indicador.', origem);

      return null;
    }

    if (this.comunicacaoSerialSelecionada) {
      if (!this.portaSerial) {
        this.exibirErroValidacao('Selecione a porta COM.', origem);

        return null;
      }

      if (this.bitsDados !== 7 && this.bitsDados !== 8) {
        this.exibirErroValidacao(
          'Para comunicação pelo navegador, utilize 7 ou 8 bits de dados.',
          origem,
        );

        return null;
      }

      if (this.controleFluxo === 'XON_XOFF') {
        this.exibirErroValidacao(
          'O controle de fluxo XON/XOFF não é suportado pela comunicação serial do navegador.',
          origem,
        );

        return null;
      }

      /*
       * Preservamos os identificadores USB
       * obtidos anteriormente.
       */
      let usbVendorId: number | undefined;

      let usbProductId: number | undefined;

      if (this.configuracaoSalva?.comunicacao.tipo === 'SERIAL') {
        usbVendorId = this.configuracaoSalva.comunicacao.usbVendorId;

        usbProductId = this.configuracaoSalva.comunicacao.usbProductId;
      }

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

          usbVendorId,
          usbProductId,
        },
      };
    }

    // =======================================================
    // TCP/IP
    // =======================================================

    if (!this.enderecoIp.trim()) {
      this.exibirErroValidacao('Informe o endereço IP.', origem);

      return null;
    }

    if (this.portaTcp === null || this.portaTcp < 1 || this.portaTcp > 65535) {
      this.exibirErroValidacao('Informe uma porta TCP válida entre 1 e 65535.', origem);

      return null;
    }

    if (this.timeoutTcp <= 0) {
      this.exibirErroValidacao('O timeout deve ser maior que zero.', origem);

      return null;
    }

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

  private exibirErroValidacao(mensagem: string, origem: 'configuracao' | 'teste'): void {
    if (origem === 'configuracao') {
      this.mostrarMensagem(mensagem, 'erro');

      return;
    }

    this.mensagemTesteComunicacao = mensagem;
  }

  // =========================================================
  // Persistência local
  // =========================================================

  private persistirConfiguracao(): void {
    if (!this.configuracaoSalva) {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(this.configuracaoSalva));
  }

  // =========================================================
  // Carregar configuração
  // =========================================================

  private carregarConfiguracao(): void {
    const configuracaoArmazenada = localStorage.getItem(this.storageKey);

    if (!configuracaoArmazenada) {
      return;
    }

    try {
      const dados = JSON.parse(configuracaoArmazenada) as
        | IndicadorPesoConfiguracao
        | ConfiguracaoIndicadorLegada;

      /*
       * Novo formato
       */
      if ('comunicacao' in dados) {
        this.aplicarConfiguracao(dados);

        return;
      }

      /*
       * Formato antigo.
       *
       * Convertemos automaticamente para
       * a nova estrutura.
       */
      const configuracaoConvertida = this.converterConfiguracaoLegada(dados);

      this.configuracaoSalva = configuracaoConvertida;

      this.aplicarConfiguracao(configuracaoConvertida);

      /*
       * Depois da conversão, sobrescrevemos
       * o localStorage já no novo formato.
       */
      this.persistirConfiguracao();
    } catch (erro) {
      console.error('Erro ao carregar configuração do indicador:', erro);

      localStorage.removeItem(this.storageKey);
    }
  }

  // =========================================================
  // Aplicar configuração na tela
  // =========================================================

  private aplicarConfiguracao(configuracao: IndicadorPesoConfiguracao): void {
    this.configuracaoSalva = configuracao;

    this.modeloIndicador = configuracao.modelo ?? '';

    if (configuracao.comunicacao.tipo === 'SERIAL') {
      this.tipoComunicacao = 'SERIAL';

      this.portaSerial = configuracao.comunicacao.portaSerial ?? '';

      this.velocidadeSerial = configuracao.comunicacao.velocidadeSerial ?? 4800;

      this.bitsDados = configuracao.comunicacao.bitsDados ?? 7;

      this.paridade = configuracao.comunicacao.paridade ?? 'EVEN';

      this.bitsParada = configuracao.comunicacao.bitsParada ?? 2;

      this.controleFluxo = configuracao.comunicacao.controleFluxo ?? 'NONE';

      return;
    }

    // =======================================================
    // TCP/IP
    // =======================================================

    this.tipoComunicacao = 'TCP_IP';

    this.modoTcp = configuracao.comunicacao.modoTcp ?? 'CLIENT';

    this.enderecoIp = configuracao.comunicacao.enderecoIp ?? '';

    this.portaTcp = configuracao.comunicacao.portaTcp ?? null;

    this.timeoutTcp = configuracao.comunicacao.timeoutTcp ?? 5;

    this.reconexaoAutomatica = configuracao.comunicacao.reconexaoAutomatica ?? true;
  }

  // =========================================================
  // Conversão da configuração antiga
  // =========================================================

  private converterConfiguracaoLegada(
    configuracao: ConfiguracaoIndicadorLegada,
  ): IndicadorPesoConfiguracao {
    if (configuracao.tipoComunicacao === 'TCP_IP') {
      return {
        id: this.idIndicador,

        nome: this.nomeIndicador,

        modelo: configuracao.modeloIndicador ?? '',

        ativo: true,

        comunicacao: {
          tipo: 'TCP_IP',

          modoTcp: configuracao.modoTcp ?? 'CLIENT',

          enderecoIp: configuracao.enderecoIp ?? '',

          portaTcp: configuracao.portaTcp ?? null,

          timeoutTcp: configuracao.timeoutTcp ?? 5,

          reconexaoAutomatica: configuracao.reconexaoAutomatica ?? true,
        },
      };
    }

    return {
      id: this.idIndicador,

      nome: this.nomeIndicador,

      modelo: configuracao.modeloIndicador ?? '',

      ativo: true,

      comunicacao: {
        tipo: 'SERIAL',

        portaSerial: configuracao.portaSerial ?? '',

        velocidadeSerial: configuracao.velocidadeSerial ?? 4800,

        bitsDados: configuracao.bitsDados ?? 7,

        paridade: configuracao.paridade ?? 'EVEN',

        bitsParada: configuracao.bitsParada ?? 2,

        controleFluxo: configuracao.controleFluxo ?? 'NONE',
      },
    };
  }

  // =========================================================
  // Mensagens
  // =========================================================

  private limparMensagem(): void {
    this.mensagemConfiguracao = '';

    this.tipoMensagemConfiguracao = '';
  }

  private mostrarMensagem(mensagem: string, tipo: 'sucesso' | 'erro'): void {
    this.mensagemConfiguracao = mensagem;

    this.tipoMensagemConfiguracao = tipo;
  }
}
