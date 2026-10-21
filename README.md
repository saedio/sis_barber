# BarbeZap — Sistema para Barbearia

Aplicação web para gestão de uma barbearia, organizada em duas partes: uma interface para o usuário e uma API conectada a um banco PostgreSQL.

## Tecnologias

- **Frontend:** Next.js, React, TypeScript e Tailwind CSS
- **Backend:** Node.js, Express e TypeScript
- **Banco de dados:** PostgreSQL

## Estrutura

```text
frontend/   interface web
backend/    API e migrações do banco
DEPLOY.md   instruções de configuração e publicação
```

## Executar localmente

Pré-requisitos: Node.js, npm e Docker.

### 1. Inicie o banco e a API

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

Configure as variáveis do banco e do painel administrativo no arquivo `.env`. Antes de usar a aplicação, crie o banco e aplique os arquivos de `backend/database/migrations/` em ordem numérica. A migração `002_configure_test_data.sql` contém dados de configuração inicial para revisão.

### 2. Inicie a interface

Em outro terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

A interface Next.js inicia na porta `3001`. Para conectar a interface à API, configure `NEXT_PUBLIC_API_URL` conforme o endereço local do backend.

## Publicação

Consulte [DEPLOY.md](DEPLOY.md) para as etapas de hospedagem da interface, API e banco de dados, além das variáveis de ambiente necessárias.

## Segurança

Não publique senhas, chaves ou arquivos `.env`. O histórico do repositório contém um arquivo de ambiente antigo; siga as orientações de rotação de credenciais em [DEPLOY.md](DEPLOY.md) antes de usar serviços reais.
