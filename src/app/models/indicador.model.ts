// =========================================================
// Tipos gerais
// =========================================================

export type TipoComunicacaoIndicador = 'SERIAL' | 'TCP_IP';

export type ParidadeSerial = 'NONE' | 'EVEN' | 'ODD';

export type ControleFluxoSerial = 'NONE' | 'RTS_CTS' | 'XON_XOFF';

export type ModoTcp = 'CLIENT' | 'SERVER';

export type FinalidadeConexaoIndicador = 'TESTE' | 'OPERACIONAL';


// =========================================================
// Configuração Serial
// =========================================================

export interface ConfiguracaoSerialIndicador {

  tipo: 'SERIAL';

  portaSerial: string;

  velocidadeSerial: number;

  bitsDados: number;

  paridade: ParidadeSerial;

  bitsParada: number;

  controleFluxo: ControleFluxoSerial;


  /*
   * Informações opcionais utilizadas para ajudar
   * a identificar o dispositivo serial autorizado
   * pelo navegador.
   */
  usbVendorId?: number;

  usbProductId?: number;
}


// =========================================================
// Configuração TCP/IP
// =========================================================

export interface ConfiguracaoTcpIndicador {

  tipo: 'TCP_IP';

  modoTcp: ModoTcp;

  enderecoIp: string;

  portaTcp: number | null;

  timeoutTcp: number;

  reconexaoAutomatica: boolean;
}


// =========================================================
// Comunicação do indicador
// =========================================================

export type ConfiguracaoComunicacaoIndicador =
  | ConfiguracaoSerialIndicador
  | ConfiguracaoTcpIndicador;


// =========================================================
// Configuração do indicador de peso
// =========================================================

export interface IndicadorPesoConfiguracao {

  /*
   * Identificador interno único do indicador.
   *
   * Exemplos:
   *
   * indicador-principal
   * indicador-entrada
   * indicador-saida
   */
  id: string;


  /*
   * Nome amigável utilizado pela aplicação.
   */
  nome: string;


  /*
   * Modelo físico do equipamento.
   *
   * Exemplo:
   *
   * ALFA 3101-C
   * TOLEDO 9091R
   */
  modelo: string;


  /*
   * Permite desativar um indicador sem
   * excluir sua configuração.
   */
  ativo: boolean;


  /*
   * Define como o indicador está conectado.
   *
   * Pode ser Serial ou TCP/IP.
   */
  comunicacao: ConfiguracaoComunicacaoIndicador;
}


// =========================================================
// Leitura recebida do indicador
// =========================================================

export interface LeituraIndicadorPeso {

  /*
   * Mensagem original recebida do equipamento.
   *
   * Exemplo:
   *
   * PB:   1000kg PL:   1000kg T:      0kg
   */
  dadoBruto: string;


  /*
   * Peso bruto informado pelo indicador.
   */
  pesoBruto: number | null;


  /*
   * Peso líquido informado pelo indicador.
   */
  pesoLiquido: number | null;


  /*
   * Tara informada pelo indicador.
   */
  tara: number | null;


  /*
   * Momento em que a leitura foi recebida.
   */
  dataHora: Date | null;
}


// =========================================================
// Estado da conexão do indicador
// =========================================================

export interface EstadoIndicadorPeso {

  /*
   * Identificador do indicador ao qual
   * este estado pertence.
   */
  idIndicador: string;


  /*
   * Indica se o equipamento está conectado.
   */
  conectado: boolean;


  /*
   * Indica se existe uma tentativa de conexão
   * em andamento.
   */
  conectando: boolean;


  /*
   * Define a finalidade da conexão atual.
   *
   * TESTE:
   * conexão iniciada pela tela Configurações
   * para diagnóstico e validação da comunicação.
   *
   * OPERACIONAL:
   * conexão utilizada normalmente pela tela
   * de Pesagem.
   *
   * null:
   * nenhuma conexão ativa.
   */
  finalidadeConexao:
    FinalidadeConexaoIndicador | null;


  /*
   * Mensagem atual relacionada ao indicador.
   *
   * Exemplos:
   *
   * Indicador desconectado.
   * Procurando porta serial autorizada...
   * Indicador conectado.
   * Dados recebidos do indicador.
   */
  mensagem: string;


  /*
   * Última leitura conhecida deste indicador.
   */
  leitura: LeituraIndicadorPeso;
}