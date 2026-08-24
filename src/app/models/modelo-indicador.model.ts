import {
  ControleFluxoSerial,
  ParidadeSerial
} from './indicador.model';

export type ProtocoloIndicador =
  | 'ALFA_PB_PL_T'
  | 'TOLEDO'
  | 'GENERICO';

export interface ConfiguracaoSerialPadraoModelo {
  velocidadeSerial: number;
  bitsDados: number;
  paridade: ParidadeSerial;
  bitsParada: number;
  controleFluxo: ControleFluxoSerial;
}

export interface ModeloIndicador {

  /*
   * Identificador interno único.
   *
   * Exemplo:
   * alfa-3101-c
   */
  id: string;

  fabricante: string;

  modelo: string;

  descricao: string;

  /*
   * Formas de comunicação suportadas
   * por este modelo.
   */
  suportaSerial: boolean;

  suportaTcpIp: boolean;

  /*
   * Parâmetros sugeridos ao cadastrar
   * um novo indicador deste modelo.
   */
  configuracaoSerialPadrao:
    ConfiguracaoSerialPadraoModelo | null;

  /*
   * Define qual interpretador será utilizado
   * para transformar o dado bruto em peso.
   */
  protocolo:
    ProtocoloIndicador;

  ativo: boolean;
}