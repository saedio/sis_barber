import { pool } from './config/database';
import { env } from './config/env';

async function bootstrap() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Conexão com o PostgreSQL estabelecida com sucesso!');
    console.log('Horário do banco:', res.rows[0].now);

    console.log(`Servidor rodando na porta ${env.port}`);
  } catch (error) {
    console.error('Erro ao conectar na base de dados PostgreSQL:', error);
    process.exit(1);
  }
}

bootstrap();