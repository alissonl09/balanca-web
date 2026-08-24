import {
  Injectable
} from '@angular/core';

import {
  BehaviorSubject,
  Observable
} from 'rxjs';

import {
  ConfiguracaoGeral
} from '../models/configuracao-geral.model';


@Injectable({
  providedIn: 'root'
})
export class ConfiguracaoGeralService {

  // =========================================================
  // Persistência temporária
  // =========================================================

  private readonly storageKey =
    'balanca-configuracao-geral';


  // =========================================================
  // Estado da configuração
  // =========================================================

  private readonly configuracaoSubject =
    new BehaviorSubject<ConfiguracaoGeral>(
      this.criarConfiguracaoPadrao()
    );


  readonly configuracao$:
    Observable<ConfiguracaoGeral> =
      this.configuracaoSubject.asObservable();


  // =========================================================
  // Constructor
  // =========================================================

  constructor() {
    this.carregarConfiguracao();
  }


  // =========================================================
  // Obter configuração atual
  // =========================================================

  obterConfiguracaoAtual():
    ConfiguracaoGeral {

    return {
      ...this.configuracaoSubject.value
    };
  }


  // =========================================================
  // Obter unidade da balança
  // =========================================================

  obterCodigoUnidadeBalanca():
    number | null {

    return (
      this.configuracaoSubject
        .value
        .codigoUnidadeBalanca
    );
  }


  // =========================================================
  // Salvar configuração
  // =========================================================

  salvar(
    configuracao:
      ConfiguracaoGeral
  ): void {

    this.validarConfiguracao(
      configuracao
    );


    const novaConfiguracao:
      ConfiguracaoGeral = {

      codigoUnidadeBalanca:
        configuracao
          .codigoUnidadeBalanca
    };


    localStorage.setItem(
      this.storageKey,
      JSON.stringify(
        novaConfiguracao
      )
    );


    this.configuracaoSubject
      .next(
        novaConfiguracao
      );
  }


  // =========================================================
  // Carregar configuração salva
  // =========================================================

  private carregarConfiguracao():
    void {

    const dados =
      localStorage.getItem(
        this.storageKey
      );


    if (
      !dados
    ) {
      return;
    }


    try {

      const configuracao =
        JSON.parse(
          dados
        ) as ConfiguracaoGeral;


      if (
        !configuracao ||
        typeof configuracao !== 'object'
      ) {
        return;
      }


      this.configuracaoSubject
        .next({

          codigoUnidadeBalanca:
            configuracao
              .codigoUnidadeBalanca ??
            null
        });

    } catch (erro) {

      console.error(
        'Erro ao carregar configurações gerais:',
        erro
      );
    }
  }


  // =========================================================
  // Configuração padrão
  // =========================================================

  private criarConfiguracaoPadrao():
    ConfiguracaoGeral {

    return {
      codigoUnidadeBalanca:
        null
    };
  }


  // =========================================================
  // Validação
  // =========================================================

  private validarConfiguracao(
    configuracao:
      ConfiguracaoGeral
  ): void {

    if (
      configuracao
        .codigoUnidadeBalanca ===
        null
    ) {

      throw new Error(
        'Informe a unidade da balança.'
      );
    }


    if (
      !Number.isInteger(
        configuracao
          .codigoUnidadeBalanca
      ) ||
      configuracao
        .codigoUnidadeBalanca <=
        0
    ) {

      throw new Error(
        'Informe uma unidade da balança válida.'
      );
    }
  }
}