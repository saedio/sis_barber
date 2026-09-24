'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { atualizarAgendamento, criarBloqueio, getAgendamentosPorData, getBloqueios, getSlots, removerBloqueio } from '@/services/api';
import { Agendamento, BloqueioAgenda, Slot } from '@/types';
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

function formatAdminDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatSlotForDisplay(horario: string) {
  const [hours, minutes] = horario.split(':').map(Number);
  const inicio = hours * 60 + minutes;
  const fim = inicio === 19 * 60 ? inicio + 30 : inicio + 60;
  const formatar = (total: number) => `${String(Math.floor(total / 60)).padStart(2, '0')}h${String(total % 60).padStart(2, '0')}`;
  return `${formatar(inicio)} as ${formatar(fim)}`;
}

export default function AdminPage() {
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [acao, setAcao] = useState<'cancelar' | 'adiar' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<Slot[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [erroHorarios, setErroHorarios] = useState('');
  const [salvandoAcao, setSalvandoAcao] = useState(false);
  const [erroModal, setErroModal] = useState('');
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [telaVisivel, setTelaVisivel] = useState(false);
  const novaDataInputRef = useRef<HTMLInputElement | null>(null);
  const [gerenciarDatasAberto, setGerenciarDatasAberto] = useState(false);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [tipoBloqueio, setTipoBloqueio] = useState<'dia' | 'periodo' | 'horario' | 'recorrente'>('dia');
  const [bloqueioDataInicio, setBloqueioDataInicio] = useState('');
  const [bloqueioDataFim, setBloqueioDataFim] = useState('');
  const [bloqueioFaixa, setBloqueioFaixa] = useState<'manha' | 'tarde'>('manha');
  const [bloqueioHoraInicio, setBloqueioHoraInicio] = useState('');
  const [bloqueioHoraFim, setBloqueioHoraFim] = useState('');
  const [bloqueioDiaSemana, setBloqueioDiaSemana] = useState('0');
  const [bloqueioMotivo, setBloqueioMotivo] = useState('');
  const [bloqueioErro, setBloqueioErro] = useState('');
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTelaVisivel(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const abrirCalendario = () => {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  const abrirGerenciarDatas = async () => {
    setGerenciarDatasAberto(true);
    setBloqueioErro('');
    try {
      setBloqueios(await getBloqueios());
    } catch (err: any) {
      setBloqueioErro(err.message || 'Não foi possível carregar os bloqueios.');
    }
  };

  const salvarBloqueio = async () => {
    if (!bloqueioMotivo.trim()) {
      setBloqueioErro('Informe o motivo do bloqueio.');
      return;
    }

    if (tipoBloqueio !== 'recorrente' && !bloqueioDataInicio) {
      setBloqueioErro('Informe a data do bloqueio.');
      return;
    }

    if (tipoBloqueio === 'horario' && (!bloqueioHoraInicio || !bloqueioHoraFim)) {
      setBloqueioErro('Informe o horário inicial e final.');
      return;
    }

    setSalvandoBloqueio(true);
    setBloqueioErro('');
    const faixa = tipoBloqueio === 'periodo'
      ? (bloqueioFaixa === 'manha' ? ['10:00', '13:00'] : ['13:00', '19:30'])
      : null;

    try {
      const criado = await criarBloqueio({
        dataInicio: tipoBloqueio === 'recorrente' ? undefined : bloqueioDataInicio,
        dataFim: tipoBloqueio === 'dia' || tipoBloqueio === 'periodo' || tipoBloqueio === 'horario'
          ? (bloqueioDataFim || bloqueioDataInicio)
          : undefined,
        diaSemana: tipoBloqueio === 'recorrente' ? Number(bloqueioDiaSemana) : undefined,
        horaInicio: tipoBloqueio === 'periodo' ? faixa?.[0] : tipoBloqueio === 'horario' ? bloqueioHoraInicio : undefined,
        horaFim: tipoBloqueio === 'periodo' ? faixa?.[1] : tipoBloqueio === 'horario' ? bloqueioHoraFim : undefined,
        motivo: bloqueioMotivo,
      });
      setBloqueios((current) => [...current, criado]);
      setBloqueioMotivo('');
      setBloqueioDataInicio('');
      setBloqueioDataFim('');
      setBloqueioHoraInicio('');
      setBloqueioHoraFim('');
    } catch (err: any) {
      setBloqueioErro(err.message || 'Não foi possível criar o bloqueio.');
    } finally {
      setSalvandoBloqueio(false);
    }
  };

  const excluirBloqueio = async (id: string) => {
    try {
      await removerBloqueio(id);
      setBloqueios((current) => current.filter((bloqueio) => bloqueio.id !== id));
    } catch (err: any) {
      setBloqueioErro(err.message || 'Não foi possível remover o bloqueio.');
    }
  };

  const formatarBloqueio = (bloqueio: BloqueioAgenda) => {
    if (bloqueio.dia_semana !== null) {
      return ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][bloqueio.dia_semana];
    }
    if (bloqueio.data_inicio === bloqueio.data_fim) return formatAdminDate(bloqueio.data_inicio || '');
    return `${formatAdminDate(bloqueio.data_inicio || '')} até ${formatAdminDate(bloqueio.data_fim || '')}`;
  };

  const abrirDetalhes = (agendamento: Agendamento) => {
    setAgendamentoSelecionado(agendamento);
    setAcao(null);
    setMotivo('');
    setNovaData('');
    setNovoHorario('');
    setErroHorarios('');
    setHorariosDisponiveis([]);
    setErroModal('');
    setConfirmarCancelamento(false);
  };

  const abrirNovaData = () => {
    const input = novaDataInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') input.showPicker();
    else {
      input.focus();
      input.click();
    }
  };

  useEffect(() => {
    if (acao !== 'adiar' || !novaData || !agendamentoSelecionado) {
      setHorariosDisponiveis([]);
      return;
    }

    setCarregandoHorarios(true);
    setNovoHorario('');
    setErroHorarios('');
    getSlots(novaData, agendamentoSelecionado.servico_id)
      .then((slots) => setHorariosDisponiveis(slots.filter((slot) => slot.disponivel)))
      .catch(() => setErroHorarios('Não foi possível carregar os horários disponíveis.'))
      .finally(() => setCarregandoHorarios(false));
  }, [acao, novaData, agendamentoSelecionado]);

  const fecharDetalhes = () => {
    if (!salvandoAcao) {
      setConfirmarCancelamento(false);
      setAgendamentoSelecionado(null);
    }
  };

  const abrirWhatsApp = (mensagemPersonalizada?: string) => {
    if (!agendamentoSelecionado) return;
    const telefone = agendamentoSelecionado.cliente_telefone.replace(/\D/g, '');
    const mensagem = mensagemPersonalizada || `Olá, ${agendamentoSelecionado.cliente_nome}. Sobre seu agendamento de ${agendamentoSelecionado.servico_nome}, precisamos falar com você.`;
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer');
  };

  const executarAcao = async () => {
    if (!agendamentoSelecionado || !acao || !motivo.trim()) {
      setErroModal('Informe o motivo antes de continuar.');
      return;
    }

    if (acao === 'adiar' && (!novaData || !novoHorario)) {
      setErroModal('Selecione a nova data e horário.');
      return;
    }

    if (acao === 'cancelar' && !confirmarCancelamento) {
      setConfirmarCancelamento(true);
      return;
    }

    setSalvandoAcao(true);
    setErroModal('');

    try {
      await atualizarAgendamento({
        id: agendamentoSelecionado.id,
        action: acao,
        reason: motivo.trim(),
        newDataHoraInicio: acao === 'adiar' ? `${novaData}T${novoHorario}:00` : undefined,
      });
      const mensagem = acao === 'cancelar'
        ? `Olá, ${agendamentoSelecionado.cliente_nome}. Seu agendamento de ${agendamentoSelecionado.servico_nome} foi cancelado. Motivo: ${motivo.trim()}.`
        : `Olá, ${agendamentoSelecionado.cliente_nome}. Seu agendamento de ${agendamentoSelecionado.servico_nome} foi adiado. Novo horário: ${formatAdminDate(novaData)} às ${formatSlotForDisplay(novoHorario)}. Motivo: ${motivo.trim()}.`;
      abrirWhatsApp(mensagem);
      const dadosAtualizados = await getAgendamentosPorData(selectedDate);
      setAgendamentos(dadosAtualizados);
      setAgendamentoSelecionado(null);
    } catch (err: any) {
      setErroModal(err.message || 'Não foi possível atualizar o agendamento.');
    } finally {
      setSalvandoAcao(false);
    }
  };

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      setError('');

      try {
        const dados = await getAgendamentosPorData(selectedDate);
        setAgendamentos(dados);
      } catch {
        setAgendamentos([]);
        setError('Erro ao carregar os agendamentos.');
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
    <main className={`barbezap-shell admin-shell-page${telaVisivel ? ' is-visible' : ''}`}>
      <div className="admin-shell">
        <div className="admin-brand">
          <img src="/logo-white.svg" alt="BarbeZap" className="brand-logo brand-logo--white" />
          <span className="admin-brand-divider" aria-hidden="true" />
          <span className="admin-brand-title">ADMIN</span>
        </div>

        <h1 className="admin-page-title">Painel Administrativo</h1>
        <p className="admin-page-subtitle">
          Painel dedicado a mostrar os agendamentos e disponibilizar o acesso ao faturamento.
        </p>

        <div className="admin-topbar">
          <div className="date-picker">
            <span className="date-picker-value">{formatAdminDate(selectedDate)}</span>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Selecionar data do admin"
            />
            <button type="button" className="date-picker-trigger" onClick={abrirCalendario} aria-label="Abrir calendário">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M7 3.75V6.5M17 3.75V6.5M4.75 9.25H19.25M6.5 5.25H17.5C18.7426 5.25 19.75 6.25736 19.75 7.5V17.5C19.75 18.7426 18.7426 19.75 17.5 19.75H6.5C5.25736 19.75 4.25 18.7426 4.25 17.5V7.5C4.25 6.25736 5.25736 5.25 6.5 5.25Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="admin-actions">
            <button className="action-button" type="button" onClick={abrirGerenciarDatas}>Gerenciar datas</button>
            <Link href="/financeiro" className="action-button action-button-profit">
              Consultar faturamento
            </Link>
          </div>
        </div>

        <div className="admin-panel">
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
                    <tr
                      key={agendamento.id}
                      className="data-grid-row-clickable"
                      onClick={() => abrirDetalhes(agendamento)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') abrirDetalhes(agendamento);
                      }}
                    >
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
        </div>

        {gerenciarDatasAberto && (
          <div className="admin-modal-backdrop" role="presentation" onClick={() => setGerenciarDatasAberto(false)}>
            <section className="admin-modal schedule-block-modal" role="dialog" aria-modal="true" aria-labelledby="gerenciar-datas" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <span className="admin-modal-kicker">Agenda</span>
                  <h2 id="gerenciar-datas">Gerenciar datas</h2>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setGerenciarDatasAberto(false)} aria-label="Fechar gerenciamento de datas">×</button>
              </div>

              <div className="schedule-block-types" role="group" aria-label="Tipo de bloqueio">
                <button type="button" className={tipoBloqueio === 'dia' ? 'is-selected' : ''} onClick={() => setTipoBloqueio('dia')}>Dia inteiro</button>
                <button type="button" className={tipoBloqueio === 'periodo' ? 'is-selected' : ''} onClick={() => setTipoBloqueio('periodo')}>Período</button>
                <button type="button" className={tipoBloqueio === 'horario' ? 'is-selected' : ''} onClick={() => setTipoBloqueio('horario')}>Horário</button>
                <button type="button" className={tipoBloqueio === 'recorrente' ? 'is-selected' : ''} onClick={() => setTipoBloqueio('recorrente')}>Recorrente</button>
              </div>

              {tipoBloqueio === 'recorrente' ? (
                <label className="admin-modal-field">
                  Dia da semana
                  <select value={bloqueioDiaSemana} onChange={(event) => setBloqueioDiaSemana(event.target.value)}>
                    <option value="0">Domingo</option>
                    <option value="1">Segunda-feira</option>
                    <option value="2">Terça-feira</option>
                    <option value="3">Quarta-feira</option>
                    <option value="4">Quinta-feira</option>
                    <option value="5">Sexta-feira</option>
                    <option value="6">Sábado</option>
                  </select>
                </label>
              ) : (
                <div className="schedule-block-date-grid">
                  <label className="admin-modal-field">
                    {tipoBloqueio === 'dia' ? 'Data' : 'Data inicial'}
                    <input type="date" value={bloqueioDataInicio} onChange={(event) => setBloqueioDataInicio(event.target.value)} />
                  </label>
                  {tipoBloqueio !== 'dia' && tipoBloqueio !== 'periodo' && (
                    <label className="admin-modal-field">
                      Data final
                      <input type="date" value={bloqueioDataFim} onChange={(event) => setBloqueioDataFim(event.target.value)} />
                    </label>
                  )}
                </div>
              )}

              {tipoBloqueio === 'periodo' && (
                <label className="admin-modal-field">
                  Período do dia
                  <select value={bloqueioFaixa} onChange={(event) => setBloqueioFaixa(event.target.value as 'manha' | 'tarde')}>
                    <option value="manha">Manhã (10h00 às 13h00)</option>
                    <option value="tarde">Tarde (13h00 às 19h30)</option>
                  </select>
                </label>
              )}

              {tipoBloqueio === 'horario' && (
                <div className="schedule-block-date-grid">
                  <label className="admin-modal-field">
                    Início
                    <input type="time" value={bloqueioHoraInicio} onChange={(event) => setBloqueioHoraInicio(event.target.value)} />
                  </label>
                  <label className="admin-modal-field">
                    Fim
                    <input type="time" value={bloqueioHoraFim} onChange={(event) => setBloqueioHoraFim(event.target.value)} />
                  </label>
                </div>
              )}

              <label className="admin-modal-field">
                Motivo do bloqueio
                <textarea value={bloqueioMotivo} onChange={(event) => setBloqueioMotivo(event.target.value)} placeholder="Ex.: exame médico" rows={2} />
              </label>

              {bloqueioErro && <div className="ds-error">{bloqueioErro}</div>}
              <button type="button" className="action-button action-button-profit admin-modal-submit" onClick={salvarBloqueio} disabled={salvandoBloqueio}>
                {salvandoBloqueio ? 'Salvando...' : 'Bloquear período'}
              </button>

              <div className="schedule-block-list">
                <h3>Bloqueios ativos</h3>
                {bloqueios.length === 0 ? (
                  <span>Nenhum bloqueio cadastrado.</span>
                ) : bloqueios.map((bloqueio) => (
                  <div className="schedule-block-item" key={bloqueio.id}>
                    <div>
                      <strong>{formatarBloqueio(bloqueio)}</strong>
                      <span>{bloqueio.hora_inicio && bloqueio.hora_fim ? `${String(bloqueio.hora_inicio).slice(0, 5)} às ${String(bloqueio.hora_fim).slice(0, 5)}` : 'Dia inteiro'} · {bloqueio.motivo}</span>
                    </div>
                    <button type="button" onClick={() => excluirBloqueio(bloqueio.id)} aria-label={`Remover bloqueio de ${formatarBloqueio(bloqueio)}`}>×</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {agendamentoSelecionado && (
          <div className="admin-modal-backdrop" role="presentation" onClick={fecharDetalhes}>
            <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="detalhes-agendamento" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <span className="admin-modal-kicker">Agendamento</span>
                  <h2 id="detalhes-agendamento">Detalhes do agendamento</h2>
                </div>
                <button type="button" className="admin-modal-close" onClick={fecharDetalhes} aria-label="Fechar detalhes">
                  ×
                </button>
              </div>

              <div className="admin-modal-details">
                <strong>{agendamentoSelecionado.cliente_nome}</strong>
                <span>{agendamentoSelecionado.servico_nome}</span>
                <span>{formatTime(agendamentoSelecionado.data_hora_inicio)} às {formatTime(agendamentoSelecionado.data_hora_fim)}</span>
              </div>

              <button type="button" className="admin-whatsapp-button" onClick={() => abrirWhatsApp()}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3.25a8.75 8.75 0 0 0-7.52 13.22L3.5 20.5l4.19-.94A8.75 8.75 0 1 0 12 3.25Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.2 8.2c.25-.28.56-.3.82-.08l1.02 1.04c.23.23.24.56.04.83l-.52.67c.5 1.01 1.3 1.82 2.32 2.32l.67-.52c.27-.2.6-.19.83.04l1.04 1.02c.22.26.2.57-.08.82-.53.48-1.26.68-1.96.48-2.75-.79-4.9-2.94-5.69-5.69-.2-.7 0-1.43.48-1.96Z" fill="currentColor" />
                </svg>
                Falar com cliente via WhatsApp
              </button>

              <div className="admin-action-choice" role="group" aria-label="Ação do agendamento">
                <button
                  type="button"
                  className={`is-cancel-action${acao === 'cancelar' ? ' is-active' : ''}`}
                  onClick={() => {
                    setAcao('cancelar');
                    setMotivo('');
                    setConfirmarCancelamento(true);
                  }}
                >
                  Cancelar
                </button>
                <button type="button" className={`is-postpone-action${acao === 'adiar' ? ' is-active' : ''}`} onClick={() => setAcao('adiar')}>
                  Adiar
                </button>
              </div>

              {acao === 'adiar' && (
                <div className="admin-modal-field">
                  <span>Nova data e horário</span>
                  <div className="admin-reschedule-picker">
                    <button type="button" className={novaData ? 'has-value' : ''} onClick={abrirNovaData}>
                      {novaData && novoHorario ? `${formatAdminDate(novaData)} • ${formatSlotForDisplay(novoHorario)}` : 'Selecionar novo dia e horário'}
                    </button>
                    <input
                      ref={novaDataInputRef}
                      type="date"
                      value={novaData}
                      onChange={(event) => setNovaData(event.target.value)}
                      aria-label="Selecionar novo dia"
                    />
                  </div>
                  {novaData && (
                    <div className="admin-slot-options">
                      {carregandoHorarios ? (
                        <span>Buscando horários disponíveis...</span>
                      ) : erroHorarios ? (
                        <span className="admin-slot-message-error">{erroHorarios}</span>
                      ) : horariosDisponiveis.length === 0 ? (
                        <span className="admin-slot-message-error">Nenhum horário disponível para este dia.</span>
                      ) : (
                        horariosDisponiveis.map((slot) => (
                          <button
                            type="button"
                            key={slot.horario}
                            className={novoHorario === slot.horario ? 'is-selected' : ''}
                            onClick={() => setNovoHorario(slot.horario)}
                          >
                            {formatSlotForDisplay(slot.horario)}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {acao === 'adiar' && (
                <label className="admin-modal-field">
                  Motivo do adiamento
                  <textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Descreva o motivo" rows={3} />
                </label>
              )}

              {erroModal && <div className="ds-error">{erroModal}</div>}

              {acao === 'adiar' && (
                <button
                  type="button"
                  className="action-button action-button-profit admin-modal-submit"
                  onClick={executarAcao}
                  disabled={salvandoAcao}
                >
                  {salvandoAcao ? 'Salvando...' : `Confirmar ${acao}`}
                </button>
              )}
            </section>
          </div>
        )}

        {confirmarCancelamento && agendamentoSelecionado && (
          <div className="admin-confirm-backdrop" role="presentation">
            <section className="admin-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-cancelamento">
              <button type="button" className="admin-confirm-close" onClick={() => setConfirmarCancelamento(false)} aria-label="Fechar confirmação">
                ×
              </button>
              <h2 id="confirmar-cancelamento">Tem certeza de que quer cancelar esse agendamento?</h2>
              <p>ATENÇÃO: Essa ação não pode ser desfeita</p>
              <label className="admin-modal-field">
                Motivo do cancelamento
                <textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Descreva o motivo" rows={3} />
              </label>
              <div className="admin-confirm-actions">
                <button type="button" className="admin-cancel-submit" onClick={executarAcao} disabled={salvandoAcao || !motivo.trim()}>
                  {salvandoAcao ? 'Cancelando...' : 'Confirmar cancelamento'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
