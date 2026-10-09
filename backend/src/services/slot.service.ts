import { pool } from '../config/database';
import { ScheduleBlockService } from './schedule-block.service';
import type { PoolClient } from 'pg';

const BRAZIL_TZ = 'America/Sao_Paulo';
const HORARIOS_DISPONIVEIS = [
  '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00',
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type QueryExecutor = Pick<PoolClient, 'query'>;

export class SlotServiceError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
    this.name = 'SlotServiceError';
  }
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60).toString().padStart(2, '0');
  const minutes = (value % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getBrazilDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getBrazilMinutes(date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BRAZIL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

function validateDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new SlotServiceError('A data deve estar no formato AAAA-MM-DD.');
  }
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new SlotServiceError('A data informada não existe.');
  }
  return date;
}

function parseAppointmentStart(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) throw new SlotServiceError('Data e horário inválidos.');

  const [, date, hour, minute, second] = match;
  validateDateKey(date);
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  if (hourNumber > 23 || minuteNumber > 59 || Number(second) !== 0) {
    throw new SlotServiceError('Data e horário inválidos.');
  }

  const start = new Date(`${date}T${hour}:${minute}:${second}-03:00`);
  if (Number.isNaN(start.getTime())) throw new SlotServiceError('Data e horário inválidos.');
  return { date, time: `${hour}:${minute}`, start };
}

function formatBrazilTime(value: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BRAZIL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

export class SlotService {
  private readonly scheduleBlockService = new ScheduleBlockService();

  async getAvailableDates(month: string, servicoId?: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new SlotServiceError('O mês deve estar no formato AAAA-MM.');
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const totalDays = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const dates: string[] = [];

    for (let day = 1; day <= totalDays; day += 1) {
      const data = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (data < getBrazilDateKey()) continue;

      if (servicoId) {
        const slots = await this.getAvailableSlots(data, servicoId);
        if (slots.some((slot) => slot.disponivel)) dates.push(data);
        continue;
      }

      const config = await pool.query('SELECT dias_funcionamento FROM barbearia LIMIT 1');
      const weekday = new Date(`${data}T12:00:00Z`).getUTCDay();
      if (!config.rows[0]?.dias_funcionamento?.includes(weekday)) continue;

      const blocks = await this.scheduleBlockService.getBlocksForDate(data);
      if (!blocks.some((block) => !block.hora_inicio && !block.hora_fim)) dates.push(data);
    }

    return dates;
  }

  async getAvailableSlots(
    data: string,
    servicoId: string,
    executor: QueryExecutor = pool,
    excludedAppointmentId?: string,
  ) {
    const date = validateDateKey(data);
    if (!UUID_PATTERN.test(servicoId)) throw new SlotServiceError('Serviço inválido.');
    const servicoResult = await executor.query(
      'SELECT duracao_minutos FROM servicos WHERE id = $1 AND ativo = TRUE',
      [servicoId],
    );
    if (servicoResult.rows.length === 0) {
      throw new SlotServiceError('Serviço não encontrado.', 404);
    }
    const duracaoMinutos = Number(servicoResult.rows[0].duracao_minutos);

    const configuracaoResult = await executor.query(
      `SELECT horario_abertura, horario_fechamento, inicio_almoco, fim_almoco, dias_funcionamento
       FROM barbearia
       LIMIT 1`,
    );
    if (configuracaoResult.rows.length === 0) {
      throw new SlotServiceError('Configuração da barbearia não encontrada.', 503);
    }

    const configuracao = configuracaoResult.rows[0];
    const weekday = date.getUTCDay();
    const diaAberto = configuracao.dias_funcionamento.includes(weekday);
    const agendamentosResult = await executor.query(
      `SELECT data_hora_inicio, data_hora_fim
       FROM agendamentos
       WHERE DATE(data_hora_inicio AT TIME ZONE 'America/Sao_Paulo') = $1
         AND status <> 'cancelado'
         AND ($2::uuid IS NULL OR id <> $2::uuid)`,
      [data, excludedAppointmentId || null],
    );
    const blocks = await this.scheduleBlockService.getBlocksForDate(data, executor);
    const opening = timeToMinutes(String(configuracao.horario_abertura).slice(0, 5));
    const closing = timeToMinutes(String(configuracao.horario_fechamento).slice(0, 5));
    const lunchStart = configuracao.inicio_almoco
      ? timeToMinutes(String(configuracao.inicio_almoco).slice(0, 5))
      : null;
    const lunchEnd = configuracao.fim_almoco
      ? timeToMinutes(String(configuracao.fim_almoco).slice(0, 5))
      : null;
    const today = getBrazilDateKey();
    const nowMinutes = getBrazilMinutes();

    return HORARIOS_DISPONIVEIS.map((horario) => {
      const inicioMinuto = timeToMinutes(horario);
      const fimMinuto = inicioMinuto + duracaoMinutos;
      const noAlmoco = lunchStart !== null && lunchEnd !== null
        ? inicioMinuto < lunchEnd && fimMinuto > lunchStart
        : false;
      const ocupado = agendamentosResult.rows.some((appointment) => {
        const appointmentStart = timeToMinutes(formatBrazilTime(appointment.data_hora_inicio));
        const appointmentEnd = timeToMinutes(formatBrazilTime(appointment.data_hora_fim));
        return inicioMinuto < appointmentEnd && fimMinuto > appointmentStart;
      });
      const bloqueado = blocks.some((block) => {
        if (!block.hora_inicio || !block.hora_fim) return true;
        const blockStart = timeToMinutes(String(block.hora_inicio).slice(0, 5));
        const blockEnd = timeToMinutes(String(block.hora_fim).slice(0, 5));
        return inicioMinuto < blockEnd && fimMinuto > blockStart;
      });
      const noPassado = data < today || (data === today && inicioMinuto <= nowMinutes);
      const dentroDoExpediente = inicioMinuto >= opening && fimMinuto <= closing;

      return {
        horario,
        duracao_minutos: duracaoMinutos,
        disponivel: diaAberto && !noPassado && dentroDoExpediente && !noAlmoco && !ocupado && !bloqueado,
      };
    });
  }

  async createAppointment(data: {
    clienteNome: string;
    clienteTelefone: string;
    servicoId: string;
    dataHoraInicio: string;
  }) {
    if (
      typeof data.clienteNome !== 'string' ||
      typeof data.clienteTelefone !== 'string' ||
      typeof data.servicoId !== 'string' ||
      typeof data.dataHoraInicio !== 'string'
    ) {
      throw new SlotServiceError('Dados do agendamento inválidos.');
    }
    const nome = data.clienteNome.trim();
    const telefone = data.clienteTelefone.trim();
    if (!nome || nome.length > 100 || !telefone || telefone.length > 20) {
      throw new SlotServiceError('Nome ou telefone inválido.');
    }

    const parsed = parseAppointmentStart(data.dataHoraInicio);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [parsed.date]);

      const slots = await this.getAvailableSlots(parsed.date, data.servicoId, client);
      const slot = slots.find((item) => item.horario === parsed.time);
      if (!slot || !slot.disponivel) {
        throw new SlotServiceError('Este horário não está mais disponível. Escolha outro.', 409);
      }

      const clienteResult = await client.query(
        `INSERT INTO clientes (nome, telefone)
         VALUES ($1, $2)
         ON CONFLICT (telefone) DO UPDATE SET telefone = EXCLUDED.telefone
         RETURNING id`,
        [nome, telefone],
      );
      const fim = new Date(parsed.start.getTime() + slot.duracao_minutos * 60_000);
      const appointmentResult = await client.query(
        `INSERT INTO agendamentos
          (cliente_id, servico_id, data_hora_inicio, data_hora_fim, status)
         VALUES ($1, $2, $3, $4, 'confirmado')
         RETURNING *`,
        [clienteResult.rows[0].id, data.servicoId, parsed.start, fim],
      );

      await client.query('COMMIT');
      return appointmentResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAppointmentsByDate(data: string) {
    validateDateKey(data);
    const result = await pool.query(
      `SELECT
        a.id,
        a.data_hora_inicio,
        a.data_hora_fim,
        a.status,
        a.servico_id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        s.nome AS servico_nome,
        a.observacao,
        (s.preco * 100)::integer AS preco_centavos
       FROM agendamentos a
       JOIN clientes c ON a.cliente_id = c.id
       JOIN servicos s ON a.servico_id = s.id
       WHERE DATE(a.data_hora_inicio AT TIME ZONE 'America/Sao_Paulo') = $1
       ORDER BY a.data_hora_inicio ASC`,
      [data],
    );
    return result.rows;
  }

  async updateAppointment(data: {
    id: string;
    action: 'cancelar' | 'adiar';
    reason: string;
    newDataHoraInicio?: string;
  }) {
    if (!UUID_PATTERN.test(data.id)) throw new SlotServiceError('Agendamento inválido.');
    if (typeof data.reason !== 'string') throw new SlotServiceError('Informe o motivo da alteração.');
    const reason = data.reason.trim();
    if (!reason) throw new SlotServiceError('Informe o motivo da alteração.');

    if (data.action === 'cancelar') {
      const result = await pool.query(
        `UPDATE agendamentos
         SET status = 'cancelado', observacao = $2
         WHERE id = $1
         RETURNING *`,
        [data.id, `Cancelamento: ${reason}`],
      );
      if (result.rows.length === 0) throw new SlotServiceError('Agendamento não encontrado.', 404);
      return result.rows[0];
    }

    if (typeof data.newDataHoraInicio !== 'string' || !data.newDataHoraInicio) {
      throw new SlotServiceError('Informe a nova data e horário.');
    }
    const parsed = parseAppointmentStart(data.newDataHoraInicio);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT servico_id, status FROM agendamentos WHERE id = $1 FOR UPDATE`,
        [data.id],
      );
      if (current.rows.length === 0) throw new SlotServiceError('Agendamento não encontrado.', 404);
      if (current.rows[0].status === 'cancelado') {
        throw new SlotServiceError('Não é possível remarcar um agendamento cancelado.', 409);
      }

      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [parsed.date]);
      const slots = await this.getAvailableSlots(parsed.date, current.rows[0].servico_id, client, data.id);
      const slot = slots.find((item) => item.horario === parsed.time);
      if (!slot || !slot.disponivel) {
        throw new SlotServiceError('Este horário não está disponível para remarcação.', 409);
      }

      const fim = new Date(parsed.start.getTime() + slot.duracao_minutos * 60_000);
      const result = await client.query(
        `UPDATE agendamentos
         SET data_hora_inicio = $2, data_hora_fim = $3, observacao = $4
         WHERE id = $1
         RETURNING *`,
        [data.id, parsed.start, fim, `Adiamento: ${reason}`],
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
