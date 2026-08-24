// =========================================================
// Configurações gerais da estação de pesagem
// =========================================================

export interface ConfiguracaoGeral {

  /*
   * Código da unidade à qual esta estação
   * de pesagem pertence.
   *
   * Esse valor será utilizado nas operações
   * realizadas por esta estação, como a
   * consulta de pré-ticket na tela Pesagem.
   */
  codigoUnidadeBalanca:
    number | null;
}