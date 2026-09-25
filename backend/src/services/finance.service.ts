import { pool } from '../config/database';

export class FinanceService {
  /**
   * Lança no faturamento apenas os atendimentos já realizados: o horário de fim
   * precisa ter passado e ninguém (cliente ou barbeiro) pode ter cancelado.
   * Usamos data_hora_fim porque às 10h00 o atendimento ainda está acontecendo.
   * O período é inclusivo nas duas pontas e comparado no fuso de São Paulo.
   */
  async getRevenueByPeriod(inicio: string, fim: string) {
    const result = await pool.query(
      `SELECT
         a.id,
         a.data_hora_inicio,
         a.data_hora_fim,
         c.nome AS cliente_nome,
         c.telefone AS cliente_telefone,
         s.nome AS servico_nome,
         (s.preco * 100)::integer AS preco_centavos
       FROM agendamentos a
       JOIN clientes c ON c.id = a.cliente_id
       JOIN servicos s ON s.id = a.servico_id
       WHERE DATE(a.data_hora_inicio AT TIME ZONE 'America/Sao_Paulo') BETWEEN $1::date AND $2::date
         AND a.status <> 'cancelado'
         AND a.data_hora_fim <= NOW()
       ORDER BY a.data_hora_inicio ASC`,
      [inicio, fim]
    );

    return result.rows;
  }
}
