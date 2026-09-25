export interface Servico {
  id: string;
  nome: string;
  duracao_minutos: number;
  preco_centavos: number;
}

export interface Slot {
  horario: string;
  disponivel: boolean;
}

export interface AgendamentoInput {
  clienteNome: string;
  clienteTelefone: string;
  servicoId: string;
  dataHoraInicio: string;
}

export interface Agendamento {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: string;
  servico_id: string;
  cliente_nome: string;
  cliente_telefone: string;
  servico_nome: string;
  preco_centavos: number;
  observacao?: string | null;
}

export interface LancamentoFaturamento {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  cliente_nome: string;
  cliente_telefone: string;
  servico_nome: string;
  preco_centavos: number;
}

export interface BloqueioAgenda {
  id: string;
  data_inicio: string | null;
  data_fim: string | null;
  dia_semana: number | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  motivo: string;
  ativo: boolean;
}