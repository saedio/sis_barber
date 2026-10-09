import express from 'express';
import cors from 'cors';
import { AppointmentController } from './controllers/appointment.controller';
import { ServiceController } from './controllers/service.controller';
import { ScheduleBlockController } from './controllers/schedule-block.controller';
import { FinanceController } from './controllers/finance.controller';
import { AuthController } from './controllers/auth.controller';
import { requireAdmin } from './auth/session';

const app = express();
const appointmentController = new AppointmentController();
const serviceController = new ServiceController();
const scheduleBlockController = new ScheduleBlockController();
const financeController = new FinanceController();
const authController = new AuthController();

app.use(cors());
app.use(express.json()); // Obrigatório para ler o JSON enviado no body

// Rotas do sistema
app.post('/auth/login', (req, res) => authController.login(req, res));
app.get('/servicos', (req, res) => serviceController.list(req, res));
app.get('/agendamentos/slots', (req, res) => appointmentController.getSlots(req, res));
app.get('/agendamentos/dias-disponiveis', (req, res) => appointmentController.getAvailableDates(req, res));
app.post('/agendamentos', (req, res) => appointmentController.create(req, res));
app.get('/agendamentos', requireAdmin, (req, res) => appointmentController.list(req, res));
app.patch('/agendamentos/:id', requireAdmin, (req, res) => appointmentController.update(req, res));
app.get('/bloqueios', requireAdmin, (req, res) => scheduleBlockController.list(req, res));
app.post('/bloqueios', requireAdmin, (req, res) => scheduleBlockController.create(req, res));
app.delete('/bloqueios/:id', requireAdmin, (req, res) => scheduleBlockController.remove(req, res));
app.get('/faturamento', requireAdmin, (req, res) => financeController.getRevenueByPeriod(req, res));

export default app;
