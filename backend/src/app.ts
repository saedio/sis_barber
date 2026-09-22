import express from 'express';
import cors from 'cors';
import { AppointmentController } from './controllers/appointment.controller';

const app = express();
const appointmentController = new AppointmentController();

app.use(cors());
app.use(express.json()); // Obrigatório para ler o JSON enviado no body

// Rotas do sistema
app.get('/agendamentos/slots', (req, res) => appointmentController.getSlots(req, res));
app.post('/agendamentos', (req, res) => appointmentController.create(req, res));
app.get('/agendamentos', (req, res) => appointmentController.list(req, res));

export default app;