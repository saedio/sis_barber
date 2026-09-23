'use client';

import { useState, useEffect } from 'react';
import { getServicos, getSlots, criarAgendamento } from '@/services/api';
import { Servico, Slot } from '@/types';
import { formatCurrency } from '@/utils/formatters';

export default function Home() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [selectedServico, setSelectedServico] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');

  const [loadingServicos, setLoadingServicos] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    getServicos()
      .then((data) => {
        setServicos(data);
        if (data.length > 0) setSelectedServico(data[0].id);
      })
      .catch(() => setErro('Erro ao carregar serviços.'))
      .finally(() => setLoadingServicos(false));
  }, []);

  useEffect(() => {
    if (!selectedServico || !selectedDate) return;

    setLoadingSlots(true);
    setSelectedSlot('');
    setErro('');

    getSlots(selectedDate, selectedServico)
      .then((data) => setSlots(data))
      .catch(() => setErro('Erro ao buscar horários disponíveis.'))
      .finally(() => setLoadingSlots(false));
  }, [selectedServico, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !clienteNome || !clienteTelefone) {
      setErro('Preencha todos os campos e escolha um horário.');
      return;
    }

    setSubmitting(true);
    setErro('');

    try {
      const dataHoraInicio = `${selectedDate}T${selectedSlot}:00.000Z`;
      await criarAgendamento({
        clienteNome,
        clienteTelefone,
        servicoId: selectedServico,
        dataHoraInicio,
      });

      setSucesso(true);
      setClienteNome('');
      setClienteTelefone('');
      setSelectedSlot('');

      const slotsAtualizados = await getSlots(selectedDate, selectedServico);
      setSlots(slotsAtualizados);
    } catch (err: any) {
      setErro(err.message || 'Erro ao realizar agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-6 flex flex-col items-center">
      <div className="max-w-xl w-full bg-neutral-800 rounded-lg p-6 border border-neutral-700 shadow-xl mt-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">Agendamento Online</h1>

        {sucesso && (
          <div className="mb-4 p-4 bg-emerald-900/50 border border-emerald-500 rounded text-emerald-200 text-center">
            Agendamento realizado com sucesso!
          </div>
        )}

        {erro && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200 text-center">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">1. Escolha o Serviço</label>
            {loadingServicos ? (
              <p className="text-sm text-neutral-400">Carregando serviços...</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {servicos.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedServico(s.id)}
                    className={`p-3 rounded border text-left flex justify-between items-center transition ${
                      selectedServico === s.id
                        ? 'border-white bg-neutral-700 font-semibold'
                        : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700/50'
                    }`}
                  >
                    <span>{s.nome} ({s.duracao_minutos} min)</span>
                    <span>{formatCurrency(s.preco_centavos)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">2. Escolha a Data</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">3. Escolha o Horário</label>
            {loadingSlots ? (
              <p className="text-sm text-neutral-400">Buscando horários livres...</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {slots.map((slot) => (
                  <button
                    key={slot.horario}
                    type="button"
                    disabled={!slot.disponivel}
                    onClick={() => setSelectedSlot(slot.horario)}
                    className={`p-2 rounded border text-center text-sm transition ${
                      !slot.disponivel
                        ? 'border-neutral-800 bg-neutral-900 text-neutral-600 cursor-not-allowed'
                        : selectedSlot === slot.horario
                        ? 'border-white bg-white text-black font-bold'
                        : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    {slot.horario}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-neutral-700">
            <div>
              <label className="block text-sm font-medium mb-1">Seu Nome</label>
              <input
                type="text"
                required
                placeholder="Ex: João Silva"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Seu Telefone / WhatsApp</label>
              <input
                type="tel"
                required
                placeholder="Ex: 11999998888"
                value={clienteTelefone}
                onChange={(e) => setClienteTelefone(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedSlot}
            className="w-full py-3 bg-white text-black font-bold rounded hover:bg-neutral-200 transition disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed"
          >
            {submitting ? 'Confirmando...' : 'Confirmar Agendamento'}
          </button>
        </form>
      </div>
    </main>
  );
}
