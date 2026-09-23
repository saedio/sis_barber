import { Servico, Slot, AgendamentoInput, Agendamento } from '../types';

const API_BASE_URL = 'http://localhost:3000';

export async function getServicos(): Promise<Servico[]> {
  const res = await fetch(`${API_BASE_URL}/servicos`);
  if (!res.ok) throw new Error('Erro ao buscar serviços');
  return res.json();
}

export async function getSlots(data: string, servicoId: string): Promise<Slot[]> {
  const res = await fetch(`${API_BASE_URL}/agendamentos/slots?data=${data}&servicoId=${servicoId}`);
  if (!res.ok) throw new Error('Erro ao buscar horários livres');
  return res.json();
}

export async function criarAgendamento(data: AgendamentoInput): Promise<Agendamento> {
  const res = await fetch(`${API_BASE_URL}/agendamentos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao criar agendamento');
  return res.json();
}

export async function getAgendamentosPorData(data: string): Promise<Agendamento[]> {
  const res = await fetch(`${API_BASE_URL}/agendamentos?data=${data}`);
  if (!res.ok) throw new Error('Erro ao buscar agenda');
  return res.json();
}