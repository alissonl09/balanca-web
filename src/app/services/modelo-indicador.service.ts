import {
  Injectable
} from '@angular/core';

import {
  BehaviorSubject,
  Observable
} from 'rxjs';

import {
  ModeloIndicador
} from '../models/modelo-indicador.model';


@Injectable({
  providedIn: 'root'
})
export class ModeloIndicadorService {

  // =========================================================
  // Persistência temporária
  // =========================================================

  private readonly storageKey =
    'balanca-modelos-indicadores';


  // =========================================================
  // Estado dos modelos
  // =========================================================

  private readonly modelosSubject =
    new BehaviorSubject<ModeloIndicador[]>(
      []
    );

  readonly modelos$:
    Observable<ModeloIndicador[]> =
      this.modelosSubject.asObservable();


  // =========================================================
  // Constructor
  // =========================================================

  constructor() {
    this.carregarModelos();
  }


  // =========================================================
  // Listar
  // =========================================================

  listar(): ModeloIndicador[] {

    return [
      ...this.modelosSubject.value
    ];
  }


  // =========================================================
  // Listar somente ativos
  // =========================================================

  listarAtivos(): ModeloIndicador[] {

    return this.modelosSubject.value
      .filter(
        modelo => modelo.ativo
      );
  }


  // =========================================================
  // Buscar por ID
  // =========================================================

  obterPorId(
    id: string
  ): ModeloIndicador | null {

    const modelo =
      this.modelosSubject.value
        .find(
          item => item.id === id
        );

    return modelo ?? null;
  }


  // =========================================================
  // Salvar
  //
  // Se o ID ainda não existir:
  // cria.
  //
  // Se já existir:
  // atualiza.
  // =========================================================

  salvar(
    modelo: ModeloIndicador
  ): void {

    this.validarModelo(
      modelo
    );

    const modelosAtuais =
      this.modelosSubject.value;

    const indice =
      modelosAtuais.findIndex(
        item =>
          item.id === modelo.id
      );


    // =======================================================
    // Novo modelo
    // =======================================================

    if (
      indice === -1
    ) {

      this.validarDuplicidade(
        modelo
      );

      const novosModelos = [
        ...modelosAtuais,
        modelo
      ];

      this.atualizarModelos(
        novosModelos
      );

      return;
    }


    // =======================================================
    // Atualização
    // =======================================================

    this.validarDuplicidade(
      modelo,
      modelo.id
    );

    const novosModelos =
      modelosAtuais.map(
        item =>
          item.id === modelo.id
            ? modelo
            : item
      );

    this.atualizarModelos(
      novosModelos
    );
  }


  // =========================================================
  // Ativar / desativar
  // =========================================================

  alterarStatus(
    id: string,
    ativo: boolean
  ): void {

    const modelos =
      this.modelosSubject.value
        .map(
          modelo => {

            if (
              modelo.id !== id
            ) {
              return modelo;
            }

            return {
              ...modelo,
              ativo
            };
          }
        );

    this.atualizarModelos(
      modelos
    );
  }


  // =========================================================
  // Excluir
  // =========================================================

  excluir(
    id: string
  ): void {

    const modelos =
      this.modelosSubject.value
        .filter(
          modelo =>
            modelo.id !== id
        );

    this.atualizarModelos(
      modelos
    );
  }


  // =========================================================
  // Gerar ID
  // =========================================================

  gerarId(
    fabricante: string,
    modelo: string
  ): string {

    const texto =
      `${fabricante}-${modelo}`;

    const idBase =
      texto
        .normalize('NFD')
        .replace(
          /[\u0300-\u036f]/g,
          ''
        )
        .toLowerCase()
        .trim()
        .replace(
          /[^a-z0-9]+/g,
          '-'
        )
        .replace(
          /^-+|-+$/g,
          ''
        );

    /*
     * Exemplo:
     *
     * ALFA + 3101-C
     * →
     * alfa-3101-c
     */
    return idBase;
  }


  // =========================================================
  // Carregar do localStorage
  // =========================================================

  private carregarModelos():
    void {

    const dados =
      localStorage.getItem(
        this.storageKey
      );

    if (!dados) {

      /*
       * Primeiro uso.
       *
       * Deixamos somente o modelo que já
       * validamos durante nossos testes.
       *
       * Não inventamos parâmetros técnicos
       * para os demais equipamentos.
       */
      const modelosIniciais:
        ModeloIndicador[] = [
          {
            id:
              'alfa-3101-c',

            fabricante:
              'ALFA',

            modelo:
              '3101-C',

            descricao:
              'Indicador de peso ALFA 3101-C',

            suportaSerial:
              true,

            /*
             * Mantemos TCP/IP habilitado
             * somente se essa capacidade fizer
             * parte do cadastro que queremos
             * representar. Poderá ser ajustado
             * posteriormente na própria tela.
             */
            suportaTcpIp:
              true,

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
              'ALFA_PB_PL_T',

            ativo:
              true
          }
        ];

      this.atualizarModelos(
        modelosIniciais
      );

      return;
    }

    try {

      const modelos =
        JSON.parse(
          dados
        ) as ModeloIndicador[];

      if (
        !Array.isArray(
          modelos
        )
      ) {
        throw new Error(
          'Formato inválido para o catálogo de modelos.'
        );
      }

      this.modelosSubject.next(
        modelos
      );

    } catch (erro) {

      console.error(
        'Erro ao carregar modelos de indicadores:',
        erro
      );

      localStorage.removeItem(
        this.storageKey
      );

      this.modelosSubject.next(
        []
      );
    }
  }


  // =========================================================
  // Atualizar estado e persistência
  // =========================================================

  private atualizarModelos(
    modelos: ModeloIndicador[]
  ): void {

    this.modelosSubject.next(
      modelos
    );

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(
        modelos
      )
    );
  }


  // =========================================================
  // Validações
  // =========================================================

  private validarModelo(
    modelo: ModeloIndicador
  ): void {

    if (
      !modelo.id.trim()
    ) {
      throw new Error(
        'O identificador do modelo é obrigatório.'
      );
    }

    if (
      !modelo.fabricante.trim()
    ) {
      throw new Error(
        'O fabricante é obrigatório.'
      );
    }

    if (
      !modelo.modelo.trim()
    ) {
      throw new Error(
        'O modelo é obrigatório.'
      );
    }

    if (
      !modelo.suportaSerial &&
      !modelo.suportaTcpIp
    ) {
      throw new Error(
        'O modelo deve suportar pelo menos um tipo de comunicação.'
      );
    }

    if (
      modelo.suportaSerial &&
      !modelo.configuracaoSerialPadrao
    ) {
      throw new Error(
        'Informe a configuração Serial padrão do modelo.'
      );
    }
  }


  // =========================================================
  // Evitar fabricante/modelo duplicados
  // =========================================================

  private validarDuplicidade(
    modelo: ModeloIndicador,
    idIgnorado?: string
  ): void {

    const fabricante =
      modelo.fabricante
        .trim()
        .toUpperCase();

    const nomeModelo =
      modelo.modelo
        .trim()
        .toUpperCase();

    const duplicado =
      this.modelosSubject.value
        .some(
          item => {

            if (
              idIgnorado &&
              item.id === idIgnorado
            ) {
              return false;
            }

            return (
              item.fabricante
                .trim()
                .toUpperCase() ===
                fabricante &&
              item.modelo
                .trim()
                .toUpperCase() ===
                nomeModelo
            );
          }
        );

    if (
      duplicado
    ) {
      throw new Error(
        'Já existe um modelo cadastrado para este fabricante.'
      );
    }
  }
}