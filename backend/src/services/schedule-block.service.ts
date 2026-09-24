import { pool } from '../config/database';

export interface ScheduleBlockInput {
  dataInicio?: string;
  dataFim?: string;
  diaSemana?: number;
  horaInicio?: string;
  horaFim?: string;
  motivo: string;
}

export class ScheduleBlockService {
  async list() {
    const result = await pool.query(
      `SELECT id, data_inicio, data_fim, dia_semana, hora_inicio, hora_fim, motivo, ativo
       FROM bloqueios_agenda
       WHERE ativo = TRUE
       ORDER BY data_inicio NULLS LAST, dia_semana NULLS LAST, hora_inicio NULLS FIRST`
    );
    return result.rows;
  }

  async create(data: ScheduleBlockInput) {
    if (!data.motivo?.trim()) throw new Error('O motivo é obrigatório.');

    const isRecurring = data.diaSemana !== undefined && data.diaSemana !== null;
    if (isRecurring && (data.dataInicio || data.dataFim)) {
      throw new Error('Bloqueios recorrentes não usam datas específicas.');
    }
    if (!isRecurring && (!data.dataInicio || !data.dataFim)) {
      throw new Error('Informe a data ou período do bloqueio.');
    }
    if ((data.horaInicio && !data.horaFim) || (!data.horaInicio && data.horaFim)) {
      throw new Error('Informe início e fim do horário.');
    }

    const result = await pool.query(
      `INSERT INTO bloqueios_agenda
        (data_inicio, data_fim, dia_semana, hora_inicio, hora_fim, motivo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, data_inicio, data_fim, dia_semana, hora_inicio, hora_fim, motivo, ativo`,
      [
        isRecurring ? null : data.dataInicio,
        isRecurring ? null : data.dataFim,
        isRecurring ? data.diaSemana : null,
        data.horaInicio || null,
        data.horaFim || null,
        data.motivo.trim(),
      ]
    );

    return result.rows[0];
  }

  async remove(id: string) {
    const result = await pool.query(
      `UPDATE bloqueios_agenda SET ativo = FALSE WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) throw new Error('Bloqueio não encontrado.');
    return result.rows[0];
  }

  async getBlocksForDate(data: string) {
    const result = await pool.query(
      `SELECT hora_inicio, hora_fim
       FROM bloqueios_agenda
       WHERE ativo = TRUE
         AND (
           ($1::date BETWEEN data_inicio AND data_fim)
           OR (dia_semana = EXTRACT(DOW FROM $1::date)::int)
         )`,
      [data]
    );
    return result.rows;
  }
}
