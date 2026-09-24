import { Request, Response } from 'express';
import { pool } from '../config/database';

export class ServiceController {
	async list(_req: Request, res: Response) {
		try {
			const result = await pool.query(
				`SELECT id, nome, duracao_minutos, (preco * 100)::integer AS preco_centavos
				 FROM servicos
				 WHERE ativo = TRUE
				 ORDER BY nome`
			);

			return res.json(result.rows);
		} catch (error: any) {
			return res.status(500).json({ error: error.message });
		}
	}
}
