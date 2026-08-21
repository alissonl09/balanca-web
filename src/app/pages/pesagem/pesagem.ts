import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PreTicketResponse } from '../../models/pre-ticket-response';
import { PreTicketService } from '../../services/pre-ticket.service';

@Component({
  selector: 'app-pesagem',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './pesagem.html',
  styleUrl: './pesagem.css',
})
export class Pesagem {
  // Valores informados pelo operador.
  cdUnidadeBalanca: number | null = null;
  placa = '';

  // Resposta recebida da Libra-API.
  preTicket: PreTicketResponse | null = null;

  // Valores simulados para montar a tela de pesagem.
  // Futuramente serão fornecidos pelo indicador físico.
  pesoAtual = 12190;
  pesoEstavel = true;

  pesagem1 = 12190;
  pesagem2 = 0;
  pesoSeco = 0;

  get pesoLiquido(): number {
    return Math.abs(
      this.pesagem1 - this.pesagem2
    );
  }

  /**
   * Dados da pesagem de origem aparecem
   * somente nas operações de entrada.
   */
  get exibirDadosOrigem(): boolean {
    const tipoOperacao =
      this.preTicket?.tipoOperacao
        ?.trim()
        .toUpperCase();

    return tipoOperacao === 'ENTRADA';
  }

  // Controle visual da tela.
  carregando = false;
  mensagem = '';
  tipoMensagem:
    | 'sucesso'
    | 'erro'
    | 'aviso'
    | '' = '';

  constructor(
    private readonly preTicketService:
      PreTicketService
  ) {}

  novaPesagem(): void {
    this.placa = '';
    this.preTicket = null;

    this.mensagem = '';
    this.tipoMensagem = '';

    this.pesagem1 = 0;
    this.pesagem2 = 0;
    this.pesoSeco = 0;
  }

  consultarPreTicket(): void {
    this.limparMensagem();

    if (
      this.cdUnidadeBalanca === null ||
      this.cdUnidadeBalanca <= 0
    ) {
      this.limparPreTicket();

      this.mostrarMensagem(
        'Informe a unidade da balança.',
        'aviso'
      );

      return;
    }

    if (!this.placa.trim()) {
      this.limparPreTicket();

      this.mostrarMensagem(
        'Informe a placa do veículo.',
        'aviso'
      );

      return;
    }

    this.placa =
      this.placa.trim().toUpperCase();

    this.carregando = true;

    this.preTicketService
      .buscarPreTicket(
        this.cdUnidadeBalanca,
        this.placa
      )
      .subscribe({
        next: (
          resposta: PreTicketResponse
        ) => {
          this.preTicket = resposta;
          this.carregando = false;

          this.mostrarMensagem(
            resposta.descricaoRetorno,
            'sucesso'
          );
        },

        error: (
          erro: HttpErrorResponse
        ) => {
          this.carregando = false;
          this.limparPreTicket();
          this.tratarErro(erro);
        },
      });
  }

  formatarTipoOperacao(
    tipoOperacao:
      | string
      | null
      | undefined
  ): string {
    switch (tipoOperacao) {
      case 'ENTRADA':
        return 'RECEBIMENTO XFER';

      case 'SAIDA':
        return 'SAÍDA XFER';

      default:
        return '';
    }
  }

  private tratarErro(
    erro: HttpErrorResponse
  ): void {
    const descricaoApi =
      erro.error?.descricaoRetorno;

    switch (erro.status) {
      case 400:
        this.mostrarMensagem(
          this.obterMensagemValidacao(erro),
          'aviso'
        );
        break;

      case 401:
        this.mostrarMensagem(
          'Falha de autenticação com a Libra-API.',
          'erro'
        );
        break;

      case 404:
        this.mostrarMensagem(
          descricaoApi ??
            'Nenhuma pré-ticket encontrada para a placa informada.',
          'aviso'
        );
        break;

      case 409:
        this.mostrarMensagem(
          descricaoApi ??
            'Existe um conflito entre as pré-tickets encontradas.',
          'aviso'
        );
        break;

      case 500:
        this.mostrarMensagem(
          descricaoApi ??
            'Ocorreu um erro interno durante a consulta.',
          'erro'
        );
        break;

      case 0:
        this.mostrarMensagem(
          'Não foi possível acessar a Libra-API. Verifique se a API está em execução, o certificado HTTPS e a configuração de CORS.',
          'erro'
        );
        break;

      default:
        this.mostrarMensagem(
          descricaoApi ??
            'Não foi possível realizar a consulta.',
          'erro'
        );
    }
  }

  private obterMensagemValidacao(
    erro: HttpErrorResponse
  ): string {
    const campos = erro.error?.campos;

    if (campos) {
      const mensagens =
        Object.values(campos) as string[];

      if (mensagens.length > 0) {
        return mensagens.join(' ');
      }
    }

    return (
      erro.error?.descricaoRetorno ??
      'Verifique os parâmetros informados.'
    );
  }

  private limparPreTicket(): void {
    this.preTicket = null;
  }

  private limparMensagem(): void {
    this.mensagem = '';
    this.tipoMensagem = '';
  }

  private mostrarMensagem(
    mensagem: string,
    tipo:
      | 'sucesso'
      | 'erro'
      | 'aviso'
  ): void {
    this.mensagem = mensagem;
    this.tipoMensagem = tipo;
  }
}