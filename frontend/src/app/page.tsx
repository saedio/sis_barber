'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getServicos, getSlots, criarAgendamento } from '@/services/api';
import { Servico, Slot } from '@/types';
import { formatCurrency } from '@/utils/formatters';

function formatDateForDisplay(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  return value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatSlotForDisplay(horario: string) {
  const [hours, minutes] = horario.split(':').map(Number);
  const inicioMinutos = hours * 60 + minutes;
  const fimMinutos = inicioMinutos === 19 * 60 ? 19 * 60 + 30 : inicioMinutos + 60;
  const formatarHora = (totalMinutos: number) => {
    const hora = Math.floor(totalMinutos / 60).toString().padStart(2, '0');
    const minuto = (totalMinutos % 60).toString().padStart(2, '0');
    return `${hora}h${minuto}`;
  };

  return `${formatarHora(inicioMinutos)} as ${formatarHora(fimMinutos)}`;
}

export default function Home() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [selectedServico, setSelectedServico] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [nomeEmFoco, setNomeEmFoco] = useState(false);
  const [telefoneEmFoco, setTelefoneEmFoco] = useState(false);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');
  const [showSucesso, setShowSucesso] = useState(false);
  const [telaVisivel, setTelaVisivel] = useState(false);
  const servicoSelectRef = useRef<HTMLSelectElement | null>(null);
  const dataInputRef = useRef<HTMLInputElement | null>(null);
  const slotSelectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTelaVisivel(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const abrirListaSelect = (element: HTMLSelectElement | HTMLInputElement | null) => {
    if (!element) return;

    if ('showPicker' in element && typeof element.showPicker === 'function') {
      element.showPicker();
      return;
    }

    element.focus();
    element.click();
  };

  const servicosOrdenados = useMemo(() => {
    const ordemDesejada: Record<string, number> = {
      'Selecionar serviço': 0,
      'Corte': 1,
      'Barba': 2,
      'Luzes': 3,
      'Nevou': 4,
      'Sobrancelha': 5,
      'Combo completo': 6,
      'Atendimento kids atípicos': 7,
    };

    return [
      { id: '', nome: 'Selecionar serviço', preco_centavos: 0 },
      ...[...servicos]
        .sort((a, b) => {
          const rankA = ordemDesejada[a.nome] ?? 999;
          const rankB = ordemDesejada[b.nome] ?? 999;
          return rankA - rankB;
        })
        .map((servico) => ({ ...servico, nome: servico.nome })),
    ];
  }, [servicos]);

  const abrirListaServicos = (event?: React.MouseEvent) => {
    event?.preventDefault();

    const select = servicoSelectRef.current;
    if (!select) return;

    if (typeof select.showPicker === 'function') {
      select.showPicker();
      return;
    }

    select.focus();
    select.click();
  };

  useEffect(() => {
    let mounted = true;

    getServicos()
      .then((data) => {
        if (!mounted) return;
        setServicos(data);
        setSelectedServico((current) => current || '');
      })
      .catch(() => {
        if (!mounted) return;
        setErro('Erro ao carregar serviços.');
      })
      .finally(() => {
        if (mounted) setLoadingServicos(false);
      });

    return () => {
      mounted = false;
    };
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
  }, [selectedDate, selectedServico]);

  const servicoSelecionado = useMemo(
    () => servicos.find((servico) => servico.id === selectedServico),
    [servicos, selectedServico]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedServico || !selectedDate || !selectedSlot || !clienteNome || !clienteTelefone) {
      setErro('Preencha todos os campos antes de confirmar.');
      return;
    }

    setSubmitting(true);
    setErro('');

    try {
      await criarAgendamento({
        clienteNome,
        clienteTelefone,
        servicoId: selectedServico,
        dataHoraInicio: `${selectedDate}T${selectedSlot}:00`,
      });

      setShowSucesso(true);
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
    <main className={`barbezap-shell${telaVisivel ? ' is-visible' : ''}`}>
      <div className="barbezap-container">
        <div className="brand-row">
          <img src="/logo-white.svg" alt="BarbeZap" className="brand-logo brand-logo--white" />
        </div>

        {!showSucesso ? (
          <form onSubmit={handleSubmit} className="ds-stack">
            <h1 className="brand-heading">Agendamento Online</h1>
            <p className="ds-subtitle">
              Escolha o serviço, data e horário do seu atendimento
            </p>

            <div>
              <label className="ds-label">
                1. Escolha o serviço:
              </label>
              <div className="ds-field ds-field-select">
                {loadingServicos ? (
                  <span className="field-text">Carregando...</span>
                ) : (
                  <>
                    <select
                      ref={servicoSelectRef}
                      className={selectedServico ? '' : 'field-placeholder'}
                      value={selectedServico}
                      onChange={(e) => {
                        setSelectedServico(e.target.value);
                        e.currentTarget.blur();
                      }}
                      aria-label="Escolha o serviço"
                    >
                      <option value="">Selecionar serviço</option>
                      {servicosOrdenados
                        .filter((servico) => servico.nome !== 'Selecionar serviço')
                        .map((servico) => (
                          <option key={servico.id || servico.nome} value={servico.id || ''}>
                            {servico.nome} - {servico.id ? formatCurrency(servico.preco_centavos) : ''}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className="ds-select-trigger"
                      onClick={() => abrirListaSelect(servicoSelectRef.current)}
                      aria-label="Abrir lista de serviços"
                    >
                      ▾
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="ds-label">
                2. Escolha a data:
              </label>
              <div className="ds-field ds-field-date ds-field-select">
                <span className={`date-field-value${selectedDate ? '' : ' field-placeholder'}`}>
                  {selectedDate ? formatDateForDisplay(selectedDate) : 'Selecionar data'}
                </span>
                <input
                  ref={dataInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    e.currentTarget.blur();
                  }}
                  aria-label="Escolha a data"
                  onClick={() => abrirListaSelect(dataInputRef.current)}
                />
                <button
                  type="button"
                  className="ds-select-trigger"
                  onClick={() => abrirListaSelect(dataInputRef.current)}
                  aria-label="Abrir calendário"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M7 3.75V6.5M17 3.75V6.5M4.75 9.25H19.25M6.5 5.25H17.5C18.7426 5.25 19.75 6.25736 19.75 7.5V17.5C19.75 18.7426 18.7426 19.75 17.5 19.75H6.5C5.25736 19.75 4.25 18.7426 4.25 17.5V7.5C4.25 6.25736 5.25736 5.25 6.5 5.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="ds-label">
                3. Escolha o horário:
              </label>
              <div className="ds-field ds-field-select">
                {loadingSlots ? (
                  <span className="field-text">Buscando horários...</span>
                ) : (
                  <>
                    <select
                      ref={slotSelectRef}
                      className={selectedSlot ? '' : 'field-placeholder'}
                      value={selectedSlot}
                      onChange={(e) => {
                        setSelectedSlot(e.target.value);
                        e.currentTarget.blur();
                      }}
                      aria-label="Escolha o horário"
                    >
                      <option value="">Selecione um horário</option>
                      {slots
                        .filter((slot) => slot.disponivel)
                        .map((slot) => (
                          <option key={slot.horario} value={slot.horario}>
                            {formatSlotForDisplay(slot.horario)}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className="ds-select-trigger"
                      onClick={() => abrirListaSelect(slotSelectRef.current)}
                      aria-label="Abrir lista de horários"
                    >
                      ▾
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="ds-divider" aria-hidden="true" />

            <div className="ds-stack ds-user-fields">
              <div>
                <label className="ds-label ds-label-compact">Seu nome:</label>
                <div className="ds-field">
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    onFocus={() => setNomeEmFoco(true)}
                    onBlur={() => setNomeEmFoco(false)}
                    placeholder={nomeEmFoco ? '' : 'Insira seu nome completo'}
                  />
                </div>
              </div>

              <div>
                <label className="ds-label ds-label-compact">Seu Telefone/WhatsApp:</label>
                <div className="ds-field">
                  <input
                    type="tel"
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    onFocus={() => setTelefoneEmFoco(true)}
                    onBlur={() => setTelefoneEmFoco(false)}
                    placeholder={telefoneEmFoco ? '' : 'Ex: (11) 99999-9999'}
                  />
                </div>
              </div>
            </div>

            {erro && (
              <div className="ds-error">
                {erro}
              </div>
            )}

            <button type="submit" className="ds-button ds-button-primary" disabled={submitting}>
              {submitting ? 'Confirmando...' : 'Agendar agora'}
            </button>
          </form>
        ) : (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-card">
              <div className="modal-icon">✓</div>
              <h2>Agendamento realizado</h2>
              <p>
                Seu agendamento foi realizado com sucesso, te enviaremos uma confirmação no WhatsApp e no email cadastrado.
              </p>
              <button
                type="button"
                className="ds-button ds-button-primary"
                onClick={() => setShowSucesso(false)}
              >
                Fechar App
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
