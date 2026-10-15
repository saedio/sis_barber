# Publicar o BarbeZap

O projeto tem duas partes que precisam estar hospedadas: o front-end Next.js e a API Express com PostgreSQL. Publicar apenas `frontend` na Vercel mostra o site, mas os agendamentos e o painel precisam também da API e do banco.

## Front-end na Vercel

1. Importe este repositório e defina **Root Directory** como `frontend`.
2. Mantenha o preset **Next.js** e os comandos automáticos de build e saída.
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_API_URL` com a URL HTTPS pública da API, sem barra no final. Exemplo: `https://sua-api.example.com`.
4. Faça um novo deploy sempre que alterar essa variável, pois o Next.js a inclui no JavaScript do navegador durante o build.

Para desenvolvimento local, copie `frontend/.env.example` para `frontend/.env.local`. O valor padrão `http://localhost:3000` é usado automaticamente ao executar `next dev`.

## API e banco de dados

Hospede o diretório `backend` em um serviço que mantenha um processo Node.js ativo e disponibilize um PostgreSQL gerenciado. A configuração inicial do serviço pode usar:

- Diretório raiz: `backend`
- Comando de instalação: `npm install`
- Comando de inicialização: `npm start`

Configure no serviço `DATABASE_URL` se o provedor do PostgreSQL fornecer uma URL de conexão. Caso contrário, use `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`. Configure também:

- `ADMIN_PASSWORD`: senha forte para o painel administrativo.
- `ADMIN_SESSION_SECRET`: segredo aleatório longo para assinar as sessões.
- `CORS_ORIGINS`: domínio público da Vercel, por exemplo `https://sis-barber.vercel.app`. Separe origens adicionais por vírgula.
- `PORT`: normalmente é fornecida automaticamente pelo serviço de hospedagem.

O servidor não cria o banco nem aplica as migrações automaticamente. Crie um banco vazio e aplique, uma única vez, os arquivos em `backend/database/migrations/` na ordem numérica (`001`, `002`, `003`). Não execute as migrações de inicialização sobre um banco que já tenha as tabelas.

Para desenvolvimento local, copie `backend/.env.example` para `backend/.env` e use `docker compose` a partir do diretório `backend` para iniciar o PostgreSQL local.

## Segurança

Cadastre senhas e segredos somente no painel de variáveis do serviço correspondente. Não os coloque em `NEXT_PUBLIC_*`, no GitHub, nem no código do front-end. A API permite origens listadas em `CORS_ORIGINS`; mantenha ali apenas os domínios do seu site.
