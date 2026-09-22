import { Request, Response } from 'express';
import { SlotService } from '../services/slot.service';

const slotService = new SlotService();

export class AppointmentController {
  async getSlots(req: Request, res: Response) {
    try {
      const { data, servicoId } = req.query;

      if (!data || !servicoId) {
        return res.status(400).json({ error: 'data e servicoId são obrigatórios' });
      }

      const slots = await slotService.getAvailableSlots(
        data as string,
        servicoId as string
      );

      return res.json(slots);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { clienteNome, clienteTelefone, servicoId, dataHoraInicio } = req.body;

      if (!clienteNome || !clienteTelefone || !servicoId || !dataHoraInicio) {
        return res.status(400).json({
          error: 'clienteNome, clienteTelefone, servicoId e dataHoraInicio são obrigatórios.',
        });
      }

      const agendamento = await slotService.createAppointment({
        clienteNome,
        clienteTelefone,
        servicoId,
        dataHoraInicio,
      });

      return res.status(201).json(agendamento);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const { data } = req.query;

      if (!data) {
        return res.status(400).json({ error: 'A data é obrigatória.' });
      }

      const agendamentos = await slotService.getAppointmentsByDate(data as string);
      return res.json(agendamentos);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}