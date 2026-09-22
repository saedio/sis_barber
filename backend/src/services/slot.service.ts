import { pool } from '../config/database';

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

    const agendamentosResult = await pool.query(
      `SELECT data_hora_inicio, data_hora_fim 
       FROM agendamentos 
       WHERE DATE(data_hora_inicio) = $1 AND status != 'cancelado'`,
      [data]
    );

    const agendamentosOcupados = agendamentosResult.rows;

    const slots = [];
    let horaAtual = new Date(`${data}T09:00:00`);
    const horaFimDia = new Date(`${data}T19:00:00`);

    while (horaAtual < horaFimDia) {
      const inicioSlotStr = horaAtual.toTimeString().substring(0, 5);
      const fimSlot = new Date(horaAtual.getTime() + duracaoServico * 60000);
      const fimSlotStr = fimSlot.toTimeString().substring(0, 5);

      const noAlmoco = inicioSlotStr >= '12:00' && inicioSlotStr < '13:00';

      const ocupado = agendamentosOcupados.some((ag) => {
        const agInicio = new Date(ag.data_hora_inicio).toTimeString().substring(0, 5);
        const agFim = new Date(ag.data_hora_fim).toTimeString().substring(0, 5);
        return inicioSlotStr < agFim && fimSlotStr > agInicio;
      });

      slots.push({
        horario: inicioSlotStr,
        disponivel: !noAlmoco && !ocupado,
      });

      horaAtual = new Date(horaAtual.getTime() + 30 * 60000);
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

    const inicio = new Date(dataHoraInicio);
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
        s.preco_centavos
       FROM agendamentos a
       JOIN clientes c ON a.cliente_id = c.id
       JOIN servicos s ON a.servico_id = s.id
       WHERE DATE(a.data_hora_inicio) = $1
       ORDER BY a.data_hora_inicio ASC`,
      [data]
    );

    return result.rows;
  }
}