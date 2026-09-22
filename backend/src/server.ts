import { pool } from './config/database';
import { env } from './config/env';
import app from './app';

const PORT = env.port || 3000;

async function bootstrap() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Conexão com o PostgreSQL estabelecida com sucesso!');
    console.log('Horário do banco:', res.rows[0].now);

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao conectar na base de dados PostgreSQL:', error);
    process.exit(1);
  }
}

bootstrap();