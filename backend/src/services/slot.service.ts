import { pool } from '../config/database';

const BRAZIL_TZ = 'America/Sao_Paulo';
const HORARIOS_DISPONIVEIS = [
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const totalMinutes = value % (24 * 60);
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatBrazilTime(value: Date | string): string {
  const date = new Date(value);
  return date.toLocaleTimeString('en-GB', {
    timeZone: BRAZIL_TZ,
    hour12: false,
  }).slice(0, 5);
}

function parseLocalDateTime(value: string): Date {
  const normalized = value.includes('Z') || value.includes('+') || value.includes('-') && value.lastIndexOf('-') > 10
    ? value
    : `${value}-03:00`;

  return new Date(normalized);
}

export class SlotService {
  async getAvailableSlots(data: string, servicoId: string) {
    const servicoResult = await pool.query(
      'SELECT duracao_minutos FROM servicos WHERE id = $1',
      [servicoId]
    );

    if (servicoResult.rows.length === 0) {
      throw new Error('Serviço não encontrado.');
    }

    const duracaoServico = servicoResult.rows[0].duracao_minutos;

    const configuracaoResult = await pool.query(
      `SELECT horario_abertura, horario_fechamento, inicio_almoco, fim_almoco
       FROM barbearia
       LIMIT 1`
    );

    if (configuracaoResult.rows.length === 0) {
      throw new Error('Configuração da barbearia não encontrada.');
    }

    const configuracao = configuracaoResult.rows[0];

    const agendamentosResult = await pool.query(
      `SELECT data_hora_inicio, data_hora_fim 
       FROM agendamentos 
       WHERE DATE(data_hora_inicio AT TIME ZONE 'America/Sao_Paulo') = $1 AND status != 'cancelado'`,
      [data]
    );

    const agendamentosOcupados = agendamentosResult.rows;

    const slots = [];
    const horarioAbertura = timeToMinutes(configuracao.horario_abertura);
    const horarioFechamento = timeToMinutes(configuracao.horario_fechamento);
    const inicioAlmoco = configuracao.inicio_almoco ? timeToMinutes(configuracao.inicio_almoco) : null;
    const fimAlmoco = configuracao.fim_almoco ? timeToMinutes(configuracao.fim_almoco) : null;

    for (const horario of HORARIOS_DISPONIVEIS) {
      const inicioMinuto = timeToMinutes(horario);
      const inicioSlotStr = minutesToTime(inicioMinuto);
      const fimSlotStr = minutesToTime(inicioMinuto + duracaoServico);

      if (inicioMinuto < horarioAbertura || inicioMinuto + duracaoServico > horarioFechamento) {
        continue;
      }

      const noAlmoco = inicioAlmoco !== null && fimAlmoco !== null
        ? inicioMinuto < fimAlmoco && inicioMinuto + duracaoServico > inicioAlmoco
        : false;

      const ocupado = agendamentosOcupados.some((ag) => {
        const agInicio = timeToMinutes(formatBrazilTime(ag.data_hora_inicio));
        const agFim = timeToMinutes(formatBrazilTime(ag.data_hora_fim));
        return inicioMinuto < agFim && inicioMinuto + duracaoServico > agInicio;
      });

      slots.push({
        horario: inicioSlotStr,
        disponivel: !noAlmoco && !ocupado,
      });
    }

    return slots;
  }

  async createAppointment(data: {
    clienteNome: string;
    clienteTelefone: string;
    servicoId: string;
    dataHoraInicio: string;
  }) {
    const { clienteNome, clienteTelefone, servicoId, dataHoraInicio } = data;

    const servicoResult = await pool.query(
      'SELECT duracao_minutos FROM servicos WHERE id = $1',
      [servicoId]
    );

    if (servicoResult.rows.length === 0) {
      throw new Error('Serviço não encontrado.');
    }

    const duracaoMinutos = servicoResult.rows[0].duracao_minutos;

    const inicio = parseLocalDateTime(dataHoraInicio);
    const fim = new Date(inicio.getTime() + duracaoMinutos * 60000);

    let clienteResult = await pool.query(
      'SELECT id FROM clientes WHERE telefone = $1',
      [clienteTelefone]
    );

    let clienteId: string;

    if (clienteResult.rows.length === 0) {
      const novoCliente = await pool.query(
        'INSERT INTO clientes (nome, telefone) VALUES ($1, $2) RETURNING id',
        [clienteNome, clienteTelefone]
      );
      clienteId = novoCliente.rows[0].id;
    } else {
      clienteId = clienteResult.rows[0].id;
    }

    const agendamentoResult = await pool.query(
      `INSERT INTO agendamentos 
        (cliente_id, servico_id, data_hora_inicio, data_hora_fim, status) 
       VALUES ($1, $2, $3, $4, 'confirmado') 
       RETURNING *`,
      [clienteId, servicoId, inicio, fim]
    );

    return agendamentoResult.rows[0];
  }

  async getAppointmentsByDate(data: string) {
    const result = await pool.query(
      `SELECT 
        a.id,
        a.data_hora_inicio,
        a.data_hora_fim,
        a.status,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        s.nome as servico_nome,
        (s.preco * 100)::integer AS preco_centavos
       FROM agendamentos a
       JOIN clientes c ON a.cliente_id = c.id
       JOIN servicos s ON a.servico_id = s.id
       WHERE DATE(a.data_hora_inicio AT TIME ZONE 'America/Sao_Paulo') = $1
       ORDER BY a.data_hora_inicio ASC`,
      [data]
    );

    return result.rows;
  }
}