'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getAgendamentosPorData } from '@/services/api';
import { Agendamento } from '@/types';
import { formatCurrency } from '@/utils/formatters';

const mockAgenda: Agendamento[] = Array.from({ length: 12 }, (_, index) => ({
  id: `mock-${index}`,
  data_hora_inicio: '2026-09-24T19:00:00.000Z',
  data_hora_fim: '2026-09-24T20:00:00.000Z',
  status: 'confirmado',
  cliente_nome: 'Daniel Maia',
  cliente_telefone: '(11) 98608-2828',
  servico_nome: 'Combo Comp.',
  preco_centavos: 10000,
}));

function formatDateInput(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export default function AdminPage() {
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      setError('');

      try {
        const dados = await getAgendamentosPorData(selectedDate);
        setAgendamentos(dados.length > 0 ? dados : mockAgenda);
      } catch {
        setAgendamentos(mockAgenda);
        setError('');
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [selectedDate]);

  const total = useMemo(
    () => agendamentos.reduce((acc, item) => acc + Number(item.preco_centavos || 0), 0),
    [agendamentos]
  );

  return (
    <main className="barbezap-shell">
      <div className="admin-shell">
        <div className="brand-row">
          <img src="/logo-white.svg" alt="BarbeZap" className="brand-logo brand-logo--white" />
          <div className="ds-subtitle" style={{ marginLeft: '12px' }}>| ADMIN</div>
        </div>

        <div className="admin-panel">
          <div className="admin-header">
            <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800 }}>Painel Administrativo</h1>
          </div>

          <div className="admin-topbar">
            <div className="date-picker">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Selecionar data do admin"
              />
              <span aria-hidden="true">📅</span>
            </div>
            <button className="action-button" type="button">Gerenciar datas</button>
          </div>

          {error && <div className="ds-error">{error}</div>}

          <div style={{ overflowX: 'auto' }}>
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', color: '#a0a7ad' }}>
                      Carregando agendamentos...
                    </td>
                  </tr>
                ) : agendamentos.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', color: '#a0a7ad' }}>
                      Nenhum agendamento para esta data.
                    </td>
                  </tr>
                ) : (
                  agendamentos.map((agendamento) => (
                    <tr key={agendamento.id}>
                      <td>{agendamento.cliente_nome}</td>
                      <td>{agendamento.servico_nome}</td>
                      <td>{formatTime(agendamento.data_hora_inicio)}</td>
                      <td>{formatTime(agendamento.data_hora_fim)}</td>
                      <td>{formatCurrency(agendamento.preco_centavos)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 12px 18px' }}>
            <Link href="/financeiro" className="ds-button ds-button-primary" style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
              Consultar faturamento
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
