import { CommonModule } from '@angular/common';

import { HttpErrorResponse } from '@angular/common/http';

import { Component, OnDestroy, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Subscription } from 'rxjs';

import { IndicadorPesoConfiguracao } from '../../models/indicador.model';

import { PreTicketResponse } from '../../models/pre-ticket-response';

import { IndicadorPesoService } from '../../services/indicador-peso.service';

import { PreTicketService } from '../../services/pre-ticket.service';

@Component({
  selector: 'app-pesagem',
  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './pesagem.html',
  styleUrl: './pesagem.css',
})
export class Pesagem implements OnInit, OnDestroy {
  // =========================================================
  // Dados informados pelo operador
  // =========================================================

  cdUnidadeBalanca: number | null = null;

  placa = '';

  // =========================================================
  // Pré-ticket
  // =========================================================

  preTicket: PreTicketResponse | null = null;

  // =========================================================
  // Pesagem
  // =========================================================

  /*
   * pesoAtual agora começa zerado.
   *
   * O valor será fornecido pelo indicador
   * físico através do IndicadorPesoService.
   */
  pesoAtual = 0;

  /*
   * Ainda permanece fixo nesta etapa.
   *
   * Futuramente podemos identificar estabilidade
   * através do próprio protocolo do indicador,
   * caso o equipamento disponibilize essa informação.
   */
  pesoEstavel = true;

  /*
   * Valores das pesagens realizadas.
   *
   * Por enquanto continuam sendo controlados
   * pela própria tela.
   */
  pesagem1 = 0;

  pesagem2 = 0;

  pesoSeco = 0;

  get pesoLiquido(): number {
    return Math.abs(this.pesagem1 - this.pesagem2);
  }

  get textoStatusIndicador(): string {

  if (this.indicadorConectando) {
    return 'Conectando indicador...';
  }

  if (this.indicadorConectado) {
    return 'Indicador conectado';
  }

  return 'Indicador desconectado';
}


get classeStatusIndicador(): string {

  if (this.indicadorConectando) {
    return 'loading';
  }

  if (this.indicadorConectado) {
    return 'success';
  }

  return 'error';
}

  // =========================================================
  // Indicador de peso
  // =========================================================

  private readonly idIndicador = 'indicador-principal';

  private readonly storageKeyIndicador = 'balanca-configuracao-indicador';

  private estadoIndicadorSubscription: Subscription | null = null;

  /*
   * Estado utilizado pela tela.
   *
   * IMPORTANTE:
   * somente consideramos conectado quando
   * a conexão for OPERACIONAL.
   */
  indicadorConectado = false;

  indicadorConectando = false;

  mensagemIndicador = 'Indicador desconectado.';

  // =========================================================
  // Controle visual
  // =========================================================

  carregando = false;

  mensagem = '';

  tipoMensagem: 'sucesso' | 'erro' | 'aviso' | '' = '';

  // =========================================================
  // Constructor
  // =========================================================

  constructor(
    private readonly preTicketService: PreTicketService,

    private readonly indicadorPesoService: IndicadorPesoService,
  ) {}

  // =========================================================
  // Inicialização
  // =========================================================

  ngOnInit(): void {
    /*
     * A tela observa continuamente o estado
     * do indicador principal.
     */
    this.estadoIndicadorSubscription = this.indicadorPesoService
      .obterEstado$(this.idIndicador)
      .subscribe((estado) => {
        const conexaoOperacional = estado.conectado && estado.finalidadeConexao === 'OPERACIONAL';

        const conexaoOperacionalEmAndamento =
          estado.conectando && estado.finalidadeConexao === 'OPERACIONAL';

        this.indicadorConectado = conexaoOperacional;

        this.indicadorConectando = conexaoOperacionalEmAndamento;

        this.mensagemIndicador = estado.mensagem;

        /*
         * Somente uma leitura proveniente
         * de uma conexão OPERACIONAL pode
         * alterar o peso atual.
         */
        if (conexaoOperacional && estado.leitura.pesoBruto !== null) {
          this.pesoAtual = estado.leitura.pesoBruto;

          return;
        }

        /*
         * Segurança contra peso antigo.
         *
         * Se perdermos a conexão operacional,
         * não deixamos o último peso recebido
         * congelado no display.
         */
        if (!conexaoOperacional) {
          this.pesoAtual = 0;
        }
      });

    /*
     * Depois que a assinatura estiver pronta,
     * tentamos conectar automaticamente.
     *
     * Essa conexão será marcada como OPERACIONAL.
     */
    void this.iniciarIndicadorOperacional();
  }

  // =========================================================
  // Encerramento
  // =========================================================

  ngOnDestroy(): void {
    /*
     * A página deixa de observar o indicador.
     */
    this.estadoIndicadorSubscription?.unsubscribe();

    this.estadoIndicadorSubscription = null;

    /*
     * Ao sair da tela Pesagem, solicitamos
     * o encerramento somente de uma conexão
     * OPERACIONAL.
     *
     * O método do serviço possui proteção para
     * não derrubar uma conexão de TESTE.
     */
    void this.indicadorPesoService.desconectarOperacional(this.idIndicador);
  }

  // =========================================================
  // Conexão operacional do indicador
  // =========================================================

  private async iniciarIndicadorOperacional(): Promise<void> {
    const configuracaoArmazenada = localStorage.getItem(this.storageKeyIndicador);

    // =======================================================
    // Indicador ainda não configurado
    // =======================================================

    if (!configuracaoArmazenada) {
      this.indicadorConectado = false;

      this.pesoAtual = 0;

      this.mensagemIndicador = 'Indicador de peso não configurado.';

      return;
    }

    try {
      const configuracao = JSON.parse(configuracaoArmazenada) as IndicadorPesoConfiguracao;

      // =====================================================
      // Validação básica da configuração
      // =====================================================

      if (!configuracao || !configuracao.id || !configuracao.comunicacao) {
        this.indicadorConectado = false;

        this.pesoAtual = 0;

        this.mensagemIndicador = 'Configuração do indicador inválida.';

        return;
      }

      // =====================================================
      // Conexão operacional
      // =====================================================

      /*
       * Aqui usamos a configuração já autorizada.
       *
       * O IndicadorPesoService utilizará getPorts()
       * para Serial, portanto não deve aparecer
       * a caixa de seleção de porta do navegador.
       */
      await this.indicadorPesoService.conectarIndicador(configuracao, 'OPERACIONAL');
    } catch (erro) {
      console.error('Erro ao carregar configuração do indicador:', erro);

      this.indicadorConectado = false;

      this.pesoAtual = 0;

      this.mensagemIndicador = 'Não foi possível carregar a configuração do indicador.';
    }
  }

  // =========================================================
  // Nova pesagem
  // =========================================================

  novaPesagem(): void {
    this.placa = '';

    this.preTicket = null;

    this.mensagem = '';

    this.tipoMensagem = '';

    /*
     * Não zeramos pesoAtual aqui.
     *
     * pesoAtual representa o peso físico
     * atualmente presente na balança.
     */
    this.pesagem1 = 0;

    this.pesagem2 = 0;

    this.pesoSeco = 0;
  }

  // =========================================================
  // Consulta da Pré-ticket
  // =========================================================

  consultarPreTicket(): void {
    this.limparMensagem();

    // =======================================================
    // Validação da unidade
    // =======================================================

    if (this.cdUnidadeBalanca === null || this.cdUnidadeBalanca <= 0) {
      this.limparPreTicket();

      this.mostrarMensagem('Informe a unidade da balança.', 'aviso');

      return;
    }

    // =======================================================
    // Validação da placa
    // =======================================================

    if (!this.placa.trim()) {
      this.limparPreTicket();

      this.mostrarMensagem('Informe a placa do veículo.', 'aviso');

      return;
    }

    this.placa = this.placa.trim().toUpperCase();

    this.carregando = true;

    // =======================================================
    // Chamada da Libra-API
    // =======================================================

    this.preTicketService.buscarPreTicket(this.cdUnidadeBalanca, this.placa).subscribe({
      next: (resposta: PreTicketResponse) => {
        this.preTicket = resposta;

        this.carregando = false;

        this.mostrarMensagem(resposta.descricaoRetorno, 'sucesso');
      },

      error: (erro: HttpErrorResponse) => {
        this.carregando = false;

        this.limparPreTicket();

        this.tratarErro(erro);
      },
    });
  }

  // =========================================================
  // Dados de origem
  // =========================================================

  /**
   * Dados da pesagem de origem aparecem
   * somente nas operações de entrada.
   */
  get exibirDadosOrigem(): boolean {
    const tipoOperacao = this.preTicket?.tipoOperacao?.trim().toUpperCase();

    return tipoOperacao === 'ENTRADA';
  }

  // =========================================================
  // Formatação da operação
  // =========================================================

  formatarTipoOperacao(tipoOperacao: string | null | undefined): string {
    switch (tipoOperacao) {
      case 'ENTRADA':
        return 'RECEBIMENTO XFER';

      case 'SAIDA':
        return 'SAÍDA XFER';

      default:
        return '';
    }
  }

  // =========================================================
  // Tratamento dos erros da Libra-API
  // =========================================================

  private tratarErro(erro: HttpErrorResponse): void {
    const descricaoApi = erro.error?.descricaoRetorno;

    switch (erro.status) {
      case 400:
        this.mostrarMensagem(this.obterMensagemValidacao(erro), 'aviso');

        break;

      case 401:
        this.mostrarMensagem('Falha de autenticação com a Libra-API.', 'erro');

        break;

      case 404:
        this.mostrarMensagem(
          descricaoApi ?? 'Nenhuma pré-ticket encontrada para a placa informada.',
          'aviso',
        );

        break;

      case 409:
        this.mostrarMensagem(
          descricaoApi ?? 'Existe um conflito entre as pré-tickets encontradas.',
          'aviso',
        );

        break;

      case 500:
        this.mostrarMensagem(descricaoApi ?? 'Ocorreu um erro interno durante a consulta.', 'erro');

        break;

      case 0:
        this.mostrarMensagem(
          'Não foi possível acessar a Libra-API. Verifique se a API está em execução, o certificado HTTPS e a configuração de CORS.',
          'erro',
        );

        break;

      default:
        this.mostrarMensagem(descricaoApi ?? 'Não foi possível realizar a consulta.', 'erro');
    }
  }

  // =========================================================
  // Mensagem de validação da API
  // =========================================================

  private obterMensagemValidacao(erro: HttpErrorResponse): string {
    const campos = erro.error?.campos;

    if (campos) {
      const mensagens = Object.values(campos) as string[];

      if (mensagens.length > 0) {
        return mensagens.join(' ');
      }
    }

    return erro.error?.descricaoRetorno ?? 'Verifique os parâmetros informados.';
  }

  // =========================================================
  // Limpeza da Pré-ticket
  // =========================================================

  private limparPreTicket(): void {
    this.preTicket = null;
  }

  // =========================================================
  // Mensagens
  // =========================================================

  private limparMensagem(): void {
    this.mensagem = '';

    this.tipoMensagem = '';
  }

  private mostrarMensagem(mensagem: string, tipo: 'sucesso' | 'erro' | 'aviso'): void {
    this.mensagem = mensagem;

    this.tipoMensagem = tipo;
  }
}
