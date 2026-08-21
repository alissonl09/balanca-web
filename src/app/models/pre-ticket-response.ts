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

  codigoRetorno: string;
  descricaoRetorno: string;
}