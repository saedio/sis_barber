import { Request, Response } from 'express';
import { FinanceService } from '../services/finance.service';

const financeService = new FinanceService();

export class FinanceController {
  async getRevenueByPeriod(req: Request, res: Response) {
    try {
      const { inicio, fim } = req.query;
      const isDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

      if (!isDate(inicio) || !isDate(fim)) {
        return res.status(400).json({ error: 'inicio e fim devem estar no formato YYYY-MM-DD.' });
      }

      if ((fim as string) < (inicio as string)) {
        return res.status(400).json({ error: 'A data final não pode ser anterior à inicial.' });
      }

      return res.json(await financeService.getRevenueByPeriod(inicio as string, fim as string));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
