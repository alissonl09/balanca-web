export interface Unidade {
  readonly id: string;
  readonly codigo: number;
  readonly descricao: string;
}
export interface EstacaoBalanca {
  readonly id: string;
  readonly unidadeId: string;
  readonly codigo: string;
  readonly descricao: string;
  readonly ativo: boolean;
}
export interface ContextoEstacao {
  readonly unidade: Unidade;
  readonly estacao: EstacaoBalanca;
}
export interface LeituraEstacao {
  readonly comunicacao?: 'Desconectado' | 'Conectando' | 'Conectado' | 'Sem comunicação' | 'Erro';
  readonly peso: number | null;
  readonly unidade: 'kg';
  readonly conectado: boolean;
  readonly estavel: boolean;
  readonly dataHoraLeitura: string | null;
  readonly erro: string | null;
}
