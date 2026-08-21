import {
  CanDeactivateFn
} from '@angular/router';

import {
  Configuracoes
} from '../pages/configuracoes/configuracoes';


// =========================================================
// Proteção de saída da tela de Configurações
// =========================================================

export const configuracoesGuard:
  CanDeactivateFn<Configuracoes> = (
    component
  ) => {

    /*
     * A decisão de permitir ou impedir
     * a navegação fica no próprio componente.
     *
     * Se não houver teste ativo:
     *   true → navega normalmente.
     *
     * Se houver teste ativo:
     *   pergunta ao usuário.
     *
     * Confirmou:
     *   desconecta o teste e navega.
     *
     * Cancelou:
     *   permanece em Configurações.
     */
    return component
      .podeSairDaPagina();
  };