import { Request, Response } from 'express';
import { ScheduleBlockService } from '../services/schedule-block.service';

const scheduleBlockService = new ScheduleBlockService();

export class ScheduleBlockController {
  async list(_req: Request, res: Response) {
    try {
      return res.json(await scheduleBlockService.list());
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const block = await scheduleBlockService.create({
        dataInicio: req.body.dataInicio,
        dataFim: req.body.dataFim,
        diaSemana: req.body.diaSemana,
        horaInicio: req.body.horaInicio,
        horaFim: req.body.horaFim,
        motivo: req.body.motivo,
      });
      return res.status(201).json(block);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      return res.json(await scheduleBlockService.remove(id));
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
