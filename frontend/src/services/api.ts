import { Servico, Slot, AgendamentoInput, Agendamento, BloqueioAgenda, LancamentoFaturamento } from '../types';

const API_BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN_KEY = 'barbezap-admin-token';
const ADMIN_AUTH_EVENT = 'barbezap:auth-state-change';

export function getAdminToken() {
  return typeof window === 'undefined' ? '' : window.sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function setAdminToken(token: string) {
  window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
}

export function clearAdminToken() {
  window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
}

export function subscribeAdminAuth(onChange: () => void) {
  window.addEventListener(ADMIN_AUTH_EVENT, onChange);
  return () => window.removeEventListener(ADMIN_AUTH_EVENT, onChange);
}

export function getAdminAuthSnapshot() {
  return Boolean(getAdminToken());
}

export async function loginAdmin(password: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || 'Não foi possível entrar no painel.');
  return body.token as string;
}

async function adminFetch(path: string, init?: RequestInit) {
  const token = getAdminToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401 && token) {
    clearAdminToken();
    window.dispatchEvent(new Event('barbezap:auth-expired'));
  }
  return res;
}

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
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erro ao criar agendamento.');
  }
  return res.json();
}

export async function getAgendamentosPorData(data: string): Promise<Agendamento[]> {
  const res = await adminFetch(`/agendamentos?data=${encodeURIComponent(data)}`);
  if (!res.ok) throw new Error('Erro ao buscar agenda');
  return res.json();
}

export async function atualizarAgendamento(data: {
  id: string;
  action: 'cancelar' | 'adiar';
  reason: string;
  newDataHoraInicio?: string;
}): Promise<Agendamento> {
  const res = await adminFetch(`/agendamentos/${encodeURIComponent(data.id)}`, {
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
  const res = await adminFetch('/bloqueios');
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
  const res = await adminFetch('/bloqueios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || 'Erro ao criar bloqueio.');
  return body;
}

export async function removerBloqueio(id: string): Promise<void> {
  const res = await adminFetch(`/bloqueios/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao remover bloqueio.');
}

export async function getFaturamento(inicio: string, fim: string): Promise<LancamentoFaturamento[]> {
  const query = new URLSearchParams({ inicio, fim });
  const res = await adminFetch(`/faturamento?${query.toString()}`);
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
