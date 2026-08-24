import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Subscription
} from 'rxjs';

import {
  ModeloIndicador
} from '../../../models/modelo-indicador.model';

import {
  ModeloIndicadorService
} from '../../../services/modelo-indicador.service';


@Component({
  selector: 'app-modelos-indicadores',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './modelos-indicadores.html',
  styleUrl: './modelos-indicadores.css',
})
export class ModelosIndicadores
  implements OnInit, OnDestroy {

  // =========================================================
  // Lista de modelos
  // =========================================================

  modelos:
    ModeloIndicador[] = [];


  // =========================================================
  // Modelo selecionado
  // =========================================================

  modeloSelecionado:
    ModeloIndicador | null = null;


  // =========================================================
  // Controle da tela
  // =========================================================

  modoEdicao = false;

  novoCadastro = false;

  mensagem = '';

  tipoMensagem:
    | 'sucesso'
    | 'erro'
    | '' = '';


  // =========================================================
  // Subscription
  // =========================================================

  private modelosSubscription:
    Subscription | null = null;


  // =========================================================
  // Constructor
  // =========================================================

  constructor(
    private readonly modeloIndicadorService:
      ModeloIndicadorService
  ) {}


  // =========================================================
  // Inicialização
  // =========================================================

  ngOnInit(): void {

    this.modelosSubscription =
      this.modeloIndicadorService
        .modelos$
        .subscribe(
          modelos => {

            this.modelos =
              modelos;
          }
        );
  }


  // =========================================================
  // Encerramento
  // =========================================================

  ngOnDestroy(): void {

    this.modelosSubscription
      ?.unsubscribe();

    this.modelosSubscription =
      null;
  }


  // =========================================================
  // Selecionar modelo
  // =========================================================

  selecionarModelo(
    modelo: ModeloIndicador
  ): void {

    /*
     * Criamos uma cópia para que alterações
     * no formulário não modifiquem a lista
     * antes do usuário clicar em Salvar.
     */
    this.modeloSelecionado = {
      ...modelo,

      configuracaoSerialPadrao:
        modelo.configuracaoSerialPadrao
          ? {
              ...modelo.configuracaoSerialPadrao
            }
          : null
    };

    this.modoEdicao =
      true;

    this.novoCadastro =
      false;

    this.limparMensagem();
  }


  // =========================================================
  // Novo modelo
  // =========================================================

  novoModelo(): void {

    this.modeloSelecionado = {
      id:
        '',

      fabricante:
        '',

      modelo:
        '',

      descricao:
        '',

      suportaSerial:
        true,

      suportaTcpIp:
        false,

      configuracaoSerialPadrao: {
        velocidadeSerial:
          4800,

        bitsDados:
          7,

        paridade:
          'EVEN',

        bitsParada:
          2,

        controleFluxo:
          'NONE'
      },

      protocolo:
        'GENERICO',

      ativo:
        true
    };

    this.modoEdicao =
      true;

    this.novoCadastro =
      true;

    this.limparMensagem();
  }


  // =========================================================
  // Cancelar
  // =========================================================

  cancelar(): void {

    this.modeloSelecionado =
      null;

    this.modoEdicao =
      false;

    this.novoCadastro =
      false;

    this.limparMensagem();
  }


  // =========================================================
  // Alteração do suporte Serial
  // =========================================================

  alterarSuporteSerial(): void {

    if (
      !this.modeloSelecionado
    ) {
      return;
    }


    /*
     * Se habilitar Serial e ainda não existir
     * configuração padrão, criamos uma.
     */
    if (
      this.modeloSelecionado.suportaSerial &&
      !this.modeloSelecionado
        .configuracaoSerialPadrao
    ) {

      this.modeloSelecionado
        .configuracaoSerialPadrao = {

          velocidadeSerial:
            4800,

          bitsDados:
            7,

          paridade:
            'EVEN',

          bitsParada:
            2,

          controleFluxo:
            'NONE'
        };

      return;
    }


    /*
     * Ao desabilitar Serial, removemos
     * os parâmetros padrão.
     */
    if (
      !this.modeloSelecionado.suportaSerial
    ) {

      this.modeloSelecionado
        .configuracaoSerialPadrao =
          null;
    }
  }


  // =========================================================
  // Salvar
  // =========================================================

  salvar(): void {

    if (
      !this.modeloSelecionado
    ) {
      return;
    }

    this.limparMensagem();


    // =======================================================
    // Validações básicas
    // =======================================================

    if (
      !this.modeloSelecionado
        .fabricante
        .trim()
    ) {

      this.mostrarMensagem(
        'Informe o fabricante.',
        'erro'
      );

      return;
    }


    if (
      !this.modeloSelecionado
        .modelo
        .trim()
    ) {

      this.mostrarMensagem(
        'Informe o modelo.',
        'erro'
      );

      return;
    }


    if (
      !this.modeloSelecionado
        .suportaSerial &&
      !this.modeloSelecionado
        .suportaTcpIp
    ) {

      this.mostrarMensagem(
        'Selecione pelo menos um tipo de comunicação suportado.',
        'erro'
      );

      return;
    }


    // =======================================================
    // Normalização
    // =======================================================

    this.modeloSelecionado.fabricante =
      this.modeloSelecionado
        .fabricante
        .trim()
        .toUpperCase();

    this.modeloSelecionado.modelo =
      this.modeloSelecionado
        .modelo
        .trim();

    this.modeloSelecionado.descricao =
      this.modeloSelecionado
        .descricao
        .trim();


    /*
     * Para novos registros geramos o ID
     * automaticamente.
     *
     * Exemplo:
     *
     * ALFA + 3101-C
     * →
     * alfa-3101-c
     */
    if (
      this.novoCadastro
    ) {

      this.modeloSelecionado.id =
        this.modeloIndicadorService
          .gerarId(
            this.modeloSelecionado
              .fabricante,

            this.modeloSelecionado
              .modelo
          );
    }


    // =======================================================
    // Persistência
    // =======================================================

    try {

      this.modeloIndicadorService
        .salvar(
          this.modeloSelecionado
        );

      this.mostrarMensagem(
        'Modelo salvo com sucesso.',
        'sucesso'
      );

      /*
       * Saímos do modo de edição,
       * mas a lista permanece atualizada
       * através do BehaviorSubject.
       */
      this.modeloSelecionado =
        null;

      this.modoEdicao =
        false;

      this.novoCadastro =
        false;

    } catch (erro) {

      const mensagem =
        erro instanceof Error
          ? erro.message
          : 'Não foi possível salvar o modelo.';

      this.mostrarMensagem(
        mensagem,
        'erro'
      );
    }
  }


  // =========================================================
  // Ativar / desativar
  // =========================================================

  alterarStatus(
    modelo: ModeloIndicador
  ): void {

    this.modeloIndicadorService
      .alterarStatus(
        modelo.id,
        !modelo.ativo
      );
  }


  // =========================================================
  // Mensagens
  // =========================================================

  private limparMensagem(): void {

    this.mensagem =
      '';

    this.tipoMensagem =
      '';
  }


  private mostrarMensagem(
    mensagem: string,
    tipo:
      | 'sucesso'
      | 'erro'
  ): void {

    this.mensagem =
      mensagem;

    this.tipoMensagem =
      tipo;
  }
}