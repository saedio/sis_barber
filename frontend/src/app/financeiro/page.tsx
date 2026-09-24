'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatCurrency } from '@/utils/formatters';

const dadosFinanceiros = Array.from({ length: 12 }, (_, index) => ({
  cliente: 'Daniel Maia',
  servico: 'Combo Comp.',
  valor: 10000,
  data: `2026-09-${String(index + 1).padStart(2, '0')}`,
}));

export default function FinanceiroPage() {
  const [mes, setMes] = useState('Setembro');
  const total = dadosFinanceiros.reduce((sum, item) => sum + item.valor, 0);

  return (
    <main className="barbezap-shell">
      <div className="finance-shell">
        <div className="brand-row">
          <img src="/logo-white.svg" alt="BarbeZap" className="brand-logo brand-logo--white" />
          <div className="ds-subtitle" style={{ marginLeft: '12px' }}>| ADMIN</div>
        </div>

        <div className="finance-panel">
          <div className="finance-header">
            <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800 }}>Painel Financeiro</h1>
          </div>

          <div className="finance-topbar">
            <button className="action-button" type="button" aria-label="Mês anterior">〈</button>
            <div className="date-picker" style={{ justifyContent: 'center', minWidth: '200px' }}>
              <span>{mes}</span>
            </div>
            <button className="action-button" type="button" aria-label="Próximo mês">〉</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {dadosFinanceiros.map((item, index) => (
                  <tr key={`${item.cliente}-${index}`}>
                    <td>{item.cliente}</td>
                    <td>{item.servico}</td>
                    <td>{formatCurrency(item.valor)}</td>
                  </tr>
                ))}
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
      </div>
    </main>
  );
}
