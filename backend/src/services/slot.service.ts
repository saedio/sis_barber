import { pool } from '../config/database';
import { ScheduleBlockService } from './schedule-block.service';

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

function getSlotDuration(horario: string): number {
  return timeToMinutes(horario) === 19 * 60 ? 30 : 60;
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
  private readonly scheduleBlockService = new ScheduleBlockService();

  async getAvailableDates(month: string, servicoId?: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    const totalDays = new Date(year, monthNumber, 0).getDate();
    const dates: string[] = [];

    for (let day = 1; day <= totalDays; day += 1) {
      const data = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (servicoId) {
        const slots = await this.getAvailableSlots(data, servicoId);
        if (slots.some((slot) => slot.disponivel)) dates.push(data);
        continue;
      }

      const bloqueios = await this.scheduleBlockService.getBlocksForDate(data);
      if (!bloqueios.some((bloqueio) => !bloqueio.hora_inicio && !bloqueio.hora_fim)) dates.push(data);
    }

    return dates;
  }

  async getAvailableSlots(data: string, servicoId: string) {
    const servicoResult = await pool.query(
      'SELECT duracao_minutos FROM servicos WHERE id = $1',
      [servicoId]
    );

    if (servicoResult.rows.length === 0) {
      throw new Error('Serviço não encontrado.');
    }

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
    const bloqueios = await this.scheduleBlockService.getBlocksForDate(data);

    const slots = [];
    const horarioAbertura = timeToMinutes(configuracao.horario_abertura);
    const horarioFechamento = timeToMinutes(configuracao.horario_fechamento);
    const inicioAlmoco = configuracao.inicio_almoco ? timeToMinutes(configuracao.inicio_almoco) : null;
    const fimAlmoco = configuracao.fim_almoco ? timeToMinutes(configuracao.fim_almoco) : null;

    for (const horario of HORARIOS_DISPONIVEIS) {
      const inicioMinuto = timeToMinutes(horario);
      const duracaoSlot = getSlotDuration(horario);
      const inicioSlotStr = minutesToTime(inicioMinuto);

      if (inicioMinuto < horarioAbertura || inicioMinuto + duracaoSlot > horarioFechamento) {
        continue;
      }

      const noAlmoco = inicioAlmoco !== null && fimAlmoco !== null
        ? inicioMinuto < fimAlmoco && inicioMinuto + duracaoSlot > inicioAlmoco
        : false;

      const ocupado = agendamentosOcupados.some((ag) => {
        const agInicio = timeToMinutes(formatBrazilTime(ag.data_hora_inicio));
        const agFim = timeToMinutes(formatBrazilTime(ag.data_hora_fim));
        return inicioMinuto < agFim && inicioMinuto + duracaoSlot > agInicio;
      });

      const bloqueado = bloqueios.some((bloqueio) => {
        if (!bloqueio.hora_inicio || !bloqueio.hora_fim) return true;
        const bloqueioInicio = timeToMinutes(String(bloqueio.hora_inicio).slice(0, 5));
        const bloqueioFim = timeToMinutes(String(bloqueio.hora_fim).slice(0, 5));
        return inicioMinuto < bloqueioFim && inicioMinuto + duracaoSlot > bloqueioInicio;
      });

      slots.push({
        horario: inicioSlotStr,
        disponivel: !noAlmoco && !ocupado && !bloqueado,
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

    const inicio = parseLocalDateTime(dataHoraInicio);
    const horarioInicio = dataHoraInicio.split('T')[1]?.slice(0, 5) || '00:00';
    const fim = new Date(inicio.getTime() + getSlotDuration(horarioInicio) * 60000);

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
        a.servico_id,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        s.nome as servico_nome,
        a.observacao,
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

  async updateAppointment(data: {
    id: string;
    action: 'cancelar' | 'adiar';
    reason: string;
    newDataHoraInicio?: string;
  }) {
    const appointmentResult = await pool.query(
      `SELECT data_hora_inicio, data_hora_fim
       FROM agendamentos
       WHERE id = $1`,
      [data.id]
    );

    if (appointmentResult.rows.length === 0) {
      throw new Error('Agendamento não encontrado.');
    }

    if (data.action === 'cancelar') {
      const result = await pool.query(
        `UPDATE agendamentos
         SET status = 'cancelado', observacao = $2
         WHERE id = $1
         RETURNING *`,
        [data.id, `Cancelamento: ${data.reason}`]
      );
      return result.rows[0];
    }

    const novoInicio = parseLocalDateTime(data.newDataHoraInicio as string);
    const horarioInicio = (data.newDataHoraInicio as string).split('T')[1]?.slice(0, 5) || '00:00';
    const novoFim = new Date(novoInicio.getTime() + getSlotDuration(horarioInicio) * 60000);

    const conflictResult = await pool.query(
      `SELECT 1
       FROM agendamentos
       WHERE id <> $1
         AND status != 'cancelado'
         AND data_hora_inicio < $3
         AND data_hora_fim > $2
       LIMIT 1`,
      [data.id, novoInicio, novoFim]
    );

    if (conflictResult.rows.length > 0) {
      throw new Error('O novo horário já está ocupado.');
    }

    const result = await pool.query(
      `UPDATE agendamentos
       SET data_hora_inicio = $2, data_hora_fim = $3, observacao = $4
       WHERE id = $1
       RETURNING *`,
      [data.id, novoInicio, novoFim, `Adiamento: ${data.reason}`]
    );

    return result.rows[0];
  }
}