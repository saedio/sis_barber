'use client';

import { FormEvent, ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { clearAdminToken, getAdminAuthSnapshot, loginAdmin, setAdminToken, subscribeAdminAuth } from '@/services/api';
import Image from 'next/image';

export default function AdminAuthGate({ children }: { children: ReactNode }) {
  const authenticated = useSyncExternalStore(subscribeAdminAuth, getAdminAuthSnapshot, () => false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const expireSession = () => {
      clearAdminToken();
      setError('Sua sessão expirou. Entre novamente.');
    };
    window.addEventListener('barbezap:auth-expired', expireSession);
    return () => window.removeEventListener('barbezap:auth-expired', expireSession);
  }, []);

  const entrar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const token = await loginAdmin(password);
      setAdminToken(token);
      setPassword('');
    } catch (loginError: unknown) {
      setError(loginError instanceof Error ? loginError.message : 'Não foi possível entrar no painel.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authenticated) {
    return (
      <main className="barbezap-shell admin-auth-screen">
        <section className="admin-auth-card" aria-labelledby="admin-auth-title">
          <Image src="/logo-white.svg" alt="BarbeZap" className="brand-logo brand-logo--white" width={160} height={40} priority />
          <h1 id="admin-auth-title">Acesso administrativo</h1>
          <p>Informe a senha administrativa para continuar.</p>
          <form onSubmit={entrar}>
            <label htmlFor="admin-password">Senha</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error && <div className="ds-error" role="alert">{error}</div>}
            <button type="submit" disabled={submitting || !password}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="admin-auth-toolbar">
        <button
          type="button"
          onClick={() => {
            clearAdminToken();
          }}
        >
          Sair do painel
        </button>
      </div>
      {children}
    </>
  );
}
