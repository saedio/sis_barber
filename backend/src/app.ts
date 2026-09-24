import express from 'express';
import cors from 'cors';
import { AppointmentController } from './controllers/appointment.controller';
import { ServiceController } from './controllers/service.controller';
import { ScheduleBlockController } from './controllers/schedule-block.controller';

const app = express();
const appointmentController = new AppointmentController();
const serviceController = new ServiceController();
const scheduleBlockController = new ScheduleBlockController();

app.use(cors());
app.use(express.json()); // Obrigatório para ler o JSON enviado no body

// Rotas do sistema
app.get('/servicos', (req, res) => serviceController.list(req, res));
app.get('/agendamentos/slots', (req, res) => appointmentController.getSlots(req, res));
app.get('/agendamentos/dias-disponiveis', (req, res) => appointmentController.getAvailableDates(req, res));
app.post('/agendamentos', (req, res) => appointmentController.create(req, res));
app.get('/agendamentos', (req, res) => appointmentController.list(req, res));
app.patch('/agendamentos/:id', (req, res) => appointmentController.update(req, res));
app.get('/bloqueios', (req, res) => scheduleBlockController.list(req, res));
app.post('/bloqueios', (req, res) => scheduleBlockController.create(req, res));
app.delete('/bloqueios/:id', (req, res) => scheduleBlockController.remove(req, res));

export default app;