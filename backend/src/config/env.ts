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
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sis_barber',
  },
};

if (!env.db.password) {
  throw new Error('DB_PASSWORD deve ser definido no arquivo backend/.env.');
}
