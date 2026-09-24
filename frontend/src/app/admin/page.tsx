'use client';

import { useEffect, useState } from 'react';
import { getAgendamentosPorData } from '@/services/api';
import { Agendamento } from '@/types';
import { formatCurrency } from '@/utils/formatters';

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
        setAgendamentos(dados);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar agendamentos.');
        setAgendamentos([]);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [selectedDate]);

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">Admin</p>
            <h1 className="text-3xl font-bold text-white">Painel da barbearia</h1>
          </div>

          <label className="flex items-center gap-3 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3">
            <span className="text-sm text-neutral-300">Data</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
            />
          </label>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-500 bg-red-900/40 p-3 text-red-100">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-neutral-700 bg-neutral-800 overflow-hidden shadow-xl">
          <div className="grid grid-cols-5 gap-4 bg-neutral-700/60 px-4 py-3 text-sm font-medium text-neutral-200">
            <span>Cliente</span>
            <span>Serviço</span>
            <span>Início</span>
            <span>Fim</span>
            <span>Valor</span>
          </div>

          {loading ? (
            <div className="p-6 text-neutral-400">Carregando agendamentos...</div>
          ) : agendamentos.length === 0 ? (
            <div className="p-6 text-neutral-400">Nenhum agendamento para esta data.</div>
          ) : (
            agendamentos.map((agendamento) => (
              <div
                key={agendamento.id}
                className="grid grid-cols-5 gap-4 border-t border-neutral-700 px-4 py-4 text-sm"
              >
                <div>
                  <div className="font-medium text-white">{agendamento.cliente_nome}</div>
                  <div className="text-neutral-400">{agendamento.cliente_telefone}</div>
                </div>

                <div className="text-neutral-200">{agendamento.servico_nome}</div>
                <div className="text-neutral-200">{formatTime(agendamento.data_hora_inicio)}</div>
                <div className="text-neutral-200">{formatTime(agendamento.data_hora_fim)}</div>
                <div className="text-neutral-200">{formatCurrency(agendamento.preco_centavos)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
