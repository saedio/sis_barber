import { Servico, Slot, AgendamentoInput, Agendamento, BloqueioAgenda, LancamentoFaturamento } from '../types';

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

export async function atualizarAgendamento(data: {
  id: string;
  action: 'cancelar' | 'adiar';
  reason: string;
  newDataHoraInicio?: string;
}): Promise<Agendamento> {
  const res = await fetch(`${API_BASE_URL}/agendamentos/${data.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.error || 'Erro ao atualizar agendamento.');
  }

  return res.json();
}

export async function getBloqueios(): Promise<BloqueioAgenda[]> {
  const res = await fetch(`${API_BASE_URL}/bloqueios`);
  if (!res.ok) throw new Error('Erro ao buscar bloqueios.');
  return res.json();
}

export async function criarBloqueio(data: {
  dataInicio?: string;
  dataFim?: string;
  diaSemana?: number;
  horaInicio?: string;
  horaFim?: string;
  motivo: string;
}): Promise<BloqueioAgenda> {
  const res = await fetch(`${API_BASE_URL}/bloqueios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || 'Erro ao criar bloqueio.');
  return body;
}

export async function removerBloqueio(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/bloqueios/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao remover bloqueio.');
}

export async function getFaturamento(inicio: string, fim: string): Promise<LancamentoFaturamento[]> {
  const query = new URLSearchParams({ inicio, fim });
  const res = await fetch(`${API_BASE_URL}/faturamento?${query.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erro ao buscar o faturamento.');
  }
  return res.json();
}

export async function getDiasDisponiveis(month: string, servicoId?: string): Promise<string[]> {
  const query = new URLSearchParams({ month });
  if (servicoId) query.set('servicoId', servicoId);
  const res = await fetch(`${API_BASE_URL}/agendamentos/dias-disponiveis?${query.toString()}`);
  if (!res.ok) throw new Error('Erro ao buscar dias disponíveis.');
  return res.json();
}