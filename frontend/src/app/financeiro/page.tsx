'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { atualizarAgendamento, getFaturamento } from '@/services/api';
import { LancamentoFaturamento } from '@/types';
import { formatCurrency } from '@/utils/formatters';

const MOTIVO_PADRAO = 'Cliente não compareceu / não pagou';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type FiltroTipo = 'dia' | 'semana' | 'mes' | 'periodo';

interface Periodo {
  tipo: FiltroTipo;
  inicio: string;
  fim: string;
}

const FILTROS: { tipo: FiltroTipo; rotulo: string }[] = [
  { tipo: 'dia', rotulo: 'Dia' },
  { tipo: 'semana', rotulo: 'Semana' },
  { tipo: 'mes', rotulo: 'Mês' },
  { tipo: 'periodo', rotulo: 'Período' },
];

/** Datas sempre no fuso local, sem passar por toISOString (que joga pro UTC). */
function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(key: string, amount: number) {
  const date = fromKey(key);
  date.setDate(date.getDate() + amount);
  return toKey(date);
}

function diffEmDias(inicio: string, fim: string) {
  return Math.round((fromKey(fim).getTime() - fromKey(inicio).getTime()) / 86400000);
}

/** Semana de domingo a sábado, igual ao calendário da home. */
function periodoDoTipo(tipo: FiltroTipo, referencia: Date): Periodo {
  if (tipo === 'dia') {
    const dia = toKey(referencia);
    return { tipo, inicio: dia, fim: dia };
  }

  if (tipo === 'semana') {
    const domingo = new Date(referencia);
    domingo.setDate(domingo.getDate() - domingo.getDay());
    return { tipo, inicio: toKey(domingo), fim: addDays(toKey(domingo), 6) };
  }

  const primeiro = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const ultimo = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);
  return { tipo: 'mes', inicio: toKey(primeiro), fim: toKey(ultimo) };
}

function formatShortDate(key: string) {
  const [, month, day] = key.split('-');
  return `${day}/${month}`;
}

function formatFullDate(key: string) {
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
}

function formatPeriodoLabel(periodo: Periodo) {
  if (periodo.tipo === 'mes') {
    const [year, month] = periodo.inicio.split('-').map(Number);
    return `${MESES[month - 1]} de ${year}`;
  }

  if (periodo.tipo === 'dia') {
    return periodo.inicio === toKey(new Date())
      ? `Hoje, ${formatShortDate(periodo.inicio)}`
      : formatFullDate(periodo.inicio);
  }

  return `${formatShortDate(periodo.inicio)} a ${formatShortDate(periodo.fim)}`;
}

function formatDateTimeFromISO(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatShortDateFromISO(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export default function FinanceiroPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDoTipo('mes', new Date()));
  const [lancamentos, setLancamentos] = useState<LancamentoFaturamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState<LancamentoFaturamento | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVO_PADRAO);
  const [excluindo, setExcluindo] = useState(false);
  const [erroModal, setErroModal] = useState('');
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [anoSeletor, setAnoSeletor] = useState(() => new Date().getFullYear());
  const [rascunhoInicio, setRascunhoInicio] = useState('');
  const [rascunhoFim, setRascunhoFim] = useState('');
  const [erroFiltro, setErroFiltro] = useState('');

  const carregarFaturamento = useCallback(async (inicio: string, fim: string) => {
    setCarregando(true);
    setErro('');
    try {
      setLancamentos(await getFaturamento(inicio, fim));
    } catch (err: any) {
      setErro(err.message || 'Erro ao buscar o faturamento.');
      setLancamentos([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarFaturamento(periodo.inicio, periodo.fim);
  }, [periodo.inicio, periodo.fim, carregarFaturamento]);

  const total = useMemo(
    () => lancamentos.reduce((soma, item) => soma + item.preco_centavos, 0),
    [lancamentos]
  );

  /** As setas deslocam o período pelo tamanho do filtro ativo. */
  const deslocar = (direcao: number) => {
    setPeriodo((atual) => {
      if (atual.tipo === 'dia') {
        const dia = addDays(atual.inicio, direcao);
        return { ...atual, inicio: dia, fim: dia };
      }

      if (atual.tipo === 'semana') {
        return {
          ...atual,
          inicio: addDays(atual.inicio, direcao * 7),
          fim: addDays(atual.fim, direcao * 7),
        };
      }

      if (atual.tipo === 'mes') {
        const referencia = fromKey(atual.inicio);
        return periodoDoTipo('mes', new Date(referencia.getFullYear(), referencia.getMonth() + direcao, 1));
      }

      const tamanho = diffEmDias(atual.inicio, atual.fim) + 1;
      return {
        ...atual,
        inicio: addDays(atual.inicio, direcao * tamanho),
        fim: addDays(atual.fim, direcao * tamanho),
      };
    });
  };

  const abrirFiltro = () => {
    setAnoSeletor(Number(periodo.inicio.slice(0, 4)));
    setRascunhoInicio(periodo.inicio);
    setRascunhoFim(periodo.fim);
    setErroFiltro('');
    setFiltroAberto(true);
  };

  const escolherFiltro = (tipo: FiltroTipo) => {
    setErroFiltro('');

    if (tipo === 'periodo') {
      // Mantém as datas atuais e só troca o modo, para o barbeiro ajustar nos campos.
      setRascunhoInicio(periodo.inicio);
      setRascunhoFim(periodo.fim);
      setPeriodo((atual) => ({ ...atual, tipo: 'periodo' }));
      return;
    }

    if (tipo === 'mes') {
      setAnoSeletor(Number(periodo.inicio.slice(0, 4)));
      setPeriodo(periodoDoTipo('mes', fromKey(periodo.inicio)));
      return;
    }

    setPeriodo(periodoDoTipo(tipo, new Date()));
    setFiltroAberto(false);
  };

  const aplicarPeriodoCustomizado = () => {
    if (!rascunhoInicio || !rascunhoFim) {
      setErroFiltro('Informe a data inicial e a final.');
      return;
    }

    if (rascunhoFim < rascunhoInicio) {
      setErroFiltro('A data final não pode ser anterior à inicial.');
      return;
    }

    setPeriodo({ tipo: 'periodo', inicio: rascunhoInicio, fim: rascunhoFim });
    setFiltroAberto(false);
  };

  const abrirDetalhes = (lancamento: LancamentoFaturamento) => {
    setSelecionado(lancamento);
    setMotivo(MOTIVO_PADRAO);
    setErroModal('');
  };

  const fecharDetalhes = () => {
    setSelecionado(null);
    setConfirmarExclusao(false);
    setErroModal('');
  };

  // Excluir do faturamento significa que o cliente não compareceu/não pagou,
  // então o agendamento é cancelado e deixa de ser contabilizado.
  const excluirLancamento = async () => {
    if (!selecionado || !motivo.trim()) return;

    setExcluindo(true);
    setErroModal('');

    try {
      await atualizarAgendamento({
        id: selecionado.id,
        action: 'cancelar',
        reason: motivo.trim(),
      });
      fecharDetalhes();
      await carregarFaturamento(periodo.inicio, periodo.fim);
    } catch (err: any) {
      setErroModal(err.message || 'Não foi possível excluir o lançamento.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <main className="barbezap-shell">
      <div className="finance-shell">
        <div className="admin-brand">
          <img src="/logo-white.svg" alt="BarbeZap" className="brand-logo brand-logo--white" />
          <span className="admin-brand-divider" aria-hidden="true" />
          <span className="admin-brand-title">ADMIN</span>
        </div>

        <h1 className="admin-page-title">Painel Financeiro</h1>

        <div className="finance-topbar">
          <button
            type="button"
            className="finance-month-nav"
            onClick={() => deslocar(-1)}
            aria-label="Período anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="finance-month-pill"
            onClick={abrirFiltro}
            aria-label="Abrir filtro de período"
          >
            <span>{formatPeriodoLabel(periodo)}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4.75 6.25H19.25M7.5 12H16.5M10.5 17.75H13.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" fill="none" />
            </svg>
          </button>
          <button
            type="button"
            className="finance-month-nav"
            onClick={() => deslocar(1)}
            aria-label="Próximo período"
          >
            ›
          </button>
        </div>

        <div className="finance-panel">
          {erro && <div className="ds-error">{erro}</div>}

          <div style={{ overflowX: 'auto' }}>
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan={4}>Carregando faturamento...</td>
                  </tr>
                ) : lancamentos.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Nenhum atendimento realizado neste período.</td>
                  </tr>
                ) : (
                  lancamentos.map((item) => (
                    <tr
                      key={item.id}
                      className="data-grid-row-clickable"
                      onClick={() => abrirDetalhes(item)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          abrirDetalhes(item);
                        }
                      }}
                    >
                      <td>{formatShortDateFromISO(item.data_hora_inicio)}</td>
                      <td>{item.cliente_nome}</td>
                      <td>{item.servico_nome}</td>
                      <td>{formatCurrency(item.preco_centavos)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="total-box">Faturamento Total = {formatCurrency(total)}</div>
        </div>

        <div style={{ marginTop: '18px' }}>
          <Link href="/admin" className="ds-button ds-button-secondary" style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
            Voltar para painel administrativo
          </Link>
        </div>

        {filtroAberto && (
          <div className="admin-modal-backdrop" role="presentation" onClick={() => setFiltroAberto(false)}>
            <section
              className="admin-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="filtrar-periodo"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-modal-header">
                <div>
                  <span className="admin-modal-kicker">Faturamento</span>
                  <h2 id="filtrar-periodo">Filtrar período</h2>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setFiltroAberto(false)} aria-label="Fechar filtro">
                  ×
                </button>
              </div>

              <div className="finance-filter-presets" role="group" aria-label="Tipo de filtro">
                {FILTROS.map((opcao) => (
                  <button
                    type="button"
                    key={opcao.tipo}
                    className={periodo.tipo === opcao.tipo ? 'is-selected' : ''}
                    onClick={() => escolherFiltro(opcao.tipo)}
                  >
                    {opcao.rotulo}
                  </button>
                ))}
              </div>

              {periodo.tipo === 'mes' && (
                <>
                  <div className="finance-year-nav">
                    <button type="button" onClick={() => setAnoSeletor((ano) => ano - 1)} aria-label="Ano anterior">‹</button>
                    <strong>{anoSeletor}</strong>
                    <button type="button" onClick={() => setAnoSeletor((ano) => ano + 1)} aria-label="Próximo ano">›</button>
                  </div>

                  <div className="finance-month-options">
                    {MESES.map((nome, index) => {
                      const ativo = periodo.inicio === toKey(new Date(anoSeletor, index, 1));
                      return (
                        <button
                          type="button"
                          key={`${anoSeletor}-${nome}`}
                          className={ativo ? 'is-selected' : ''}
                          onClick={() => {
                            setPeriodo(periodoDoTipo('mes', new Date(anoSeletor, index, 1)));
                            setFiltroAberto(false);
                          }}
                        >
                          {nome.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {periodo.tipo === 'periodo' && (
                <>
                  <div className="finance-range-fields">
                    <label className="admin-modal-field">
                      De
                      <input
                        type="date"
                        value={rascunhoInicio}
                        max={rascunhoFim || undefined}
                        onChange={(event) => setRascunhoInicio(event.target.value)}
                      />
                    </label>
                    <label className="admin-modal-field">
                      Até
                      <input
                        type="date"
                        value={rascunhoFim}
                        min={rascunhoInicio || undefined}
                        onChange={(event) => setRascunhoFim(event.target.value)}
                      />
                    </label>
                  </div>

                  {erroFiltro && <div className="ds-error">{erroFiltro}</div>}

                  <button
                    type="button"
                    className="action-button action-button-profit admin-modal-submit"
                    onClick={aplicarPeriodoCustomizado}
                  >
                    Aplicar período
                  </button>
                </>
              )}

              {(periodo.tipo === 'dia' || periodo.tipo === 'semana') && (
                <p className="finance-filter-hint">
                  Use as setas ‹ › na tela para andar {periodo.tipo === 'dia' ? 'de dia em dia' : 'de semana em semana'}.
                </p>
              )}
            </section>
          </div>
        )}

        {selecionado && (
          <div className="admin-modal-backdrop" role="presentation" onClick={fecharDetalhes}>
            <section
              className="admin-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="detalhes-lancamento"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-modal-header">
                <div>
                  <span className="admin-modal-kicker">Lançamento</span>
                  <h2 id="detalhes-lancamento">Detalhes do lançamento</h2>
                </div>
                <button type="button" className="admin-modal-close" onClick={fecharDetalhes} aria-label="Fechar detalhes">
                  ×
                </button>
              </div>

              <div className="admin-modal-details">
                <strong>{selecionado.cliente_nome}</strong>
                <span>{selecionado.servico_nome}</span>
                <span>
                  {formatDateTimeFromISO(selecionado.data_hora_inicio)} • {formatTime(selecionado.data_hora_inicio)} às {formatTime(selecionado.data_hora_fim)}
                </span>
                <span className="finance-detail-value">{formatCurrency(selecionado.preco_centavos)}</span>
              </div>

              {erroModal && <div className="ds-error">{erroModal}</div>}

              <button
                type="button"
                className="admin-modal-submit admin-cancel-submit"
                onClick={() => {
                  setMotivo(MOTIVO_PADRAO);
                  setConfirmarExclusao(true);
                }}
              >
                Excluir do faturamento
              </button>
            </section>
          </div>
        )}

        {confirmarExclusao && selecionado && (
          <div className="admin-confirm-backdrop" role="presentation">
            <section className="admin-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-exclusao">
              <button type="button" className="admin-confirm-close" onClick={() => setConfirmarExclusao(false)} aria-label="Fechar confirmação">
                ×
              </button>
              <h2 id="confirmar-exclusao">Excluir {formatCurrency(selecionado.preco_centavos)} do faturamento?</h2>
              <p>
                ATENÇÃO: o atendimento de {selecionado.cliente_nome} será cancelado e sai do faturamento. Essa ação não pode ser desfeita.
              </p>
              <label className="admin-modal-field">
                Motivo da exclusão
                <textarea
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  placeholder="Descreva o motivo"
                  rows={3}
                />
              </label>

              {erroModal && <div className="ds-error">{erroModal}</div>}

              <div className="admin-confirm-actions">
                <button
                  type="button"
                  className="admin-cancel-submit"
                  onClick={excluirLancamento}
                  disabled={excluindo || !motivo.trim()}
                >
                  {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
