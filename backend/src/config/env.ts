import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

export const env = {
  port: Number(process.env.PORT) || 3000,
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminSessionSecret: process.env.ADMIN_SESSION_SECRET || '',
  corsOrigins: (process.env.CORS_ORIGINS
    || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001'))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    connectionString: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sis_barber',
  },
};

if (!env.db.connectionString && !env.db.password) {
  throw new Error('Defina DATABASE_URL ou DB_PASSWORD no ambiente do back-end.');
}

if (process.env.NODE_ENV === 'production' && !env.adminPassword) {
  throw new Error('ADMIN_PASSWORD deve ser definido no ambiente de produção.');
}

if (process.env.NODE_ENV === 'production' && !env.adminSessionSecret) {
  throw new Error('ADMIN_SESSION_SECRET deve ser definido no ambiente de produção.');
}

if (process.env.NODE_ENV === 'production' && env.corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS deve incluir o domínio público do front-end.');
}
