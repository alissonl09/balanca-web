export interface PreTicketResponse {
  tipoDocumento: string | null;
  tipoOperacao: string | null;
  nota: string | null;
  emissor: string | null;
  motorista: string | null;
  transportador: string | null;
  quantidadeTotal: number | null;
  codigoEmbalagem: string | null;
  deposito: string | null;
  numeroSequencia: number | null;
  numeroTicketOrigem: number | null;
  codigoUnidadeOrigem: number | null;
  pesoLiquidoOrigem: number | null;

  /*
   * Placas das carretas associadas ao cavalo.
   *
   * A propriedade é opcional nesta etapa porque
   * a Libra-API ainda não foi ajustada para enviá-la.
   */
  placasCarretas?: string[] | null;
  codigoRetorno: string;
  descricaoRetorno: string;
}