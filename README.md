# Help Finance

A melhor plataforma para controlar as suas finanças — gerenciador financeiro completo com dashboard, movimentações, investimentos e chat.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Banco de Dados:** MongoDB Atlas + Mongoose
- **Autenticação:** NextAuth.js v5 (email/senha)
- **Gráficos:** Recharts
- **Estilização:** Tailwind CSS v4 (dark theme)
- **API de Cotações:** brapi.dev
- **Deploy:** Vercel

## Funcionalidades

- Login e Cadastro com email/senha
- **Dashboard:** resumo do mês, gráficos, investimentos, atalhos
- **Movimentações:** lançamentos de receitas e despesas por mês
- **Investimentos:** carteira com cotações em tempo real via brapi.dev
- **Chat:** interface de chatbot (UI pronta, IA a implementar)
- **Perfil:** configurações de meta mensal da família, meta e perfil de investidor

## Configuração Local

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo `.env.local` na raiz com as variáveis:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/help-finance
NEXTAUTH_SECRET=sua-chave-secreta-aqui
NEXTAUTH_URL=http://localhost:3000
BRAPI_TOKEN=seu-token-brapi-aqui
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

## Deploy na Vercel

1. Crie um projeto na [Vercel](https://vercel.com) apontando para este repositório.
2. Configure as variáveis de ambiente no painel da Vercel:
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET` (gere com `openssl rand -base64 32`)
   - `NEXTAUTH_URL` (URL do seu app na Vercel, ex: `https://help-finance.vercel.app`)
   - `BRAPI_TOKEN` (opcional, obtenha em https://brapi.dev)
3. Faça o deploy — a Vercel detecta Next.js automaticamente.

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/login, /cadastro     # Páginas de autenticação
│   ├── (dashboard)/                # App principal (requer auth)
│   │   ├── page.tsx                # Dashboard
│   │   ├── movimentacoes/          # Movimentações
│   │   ├── investimentos/          # Investimentos
│   │   ├── chat/                   # Chat (UI)
│   │   └── perfil/                 # Configurações
│   └── api/                        # API Routes
├── components/
│   ├── ui/                         # Card, Button, ProgressBar, Modal, MonthSelector
│   ├── charts/                     # FinanceLineChart, SpendingDonutChart, ProgressRing
│   ├── layout/                     # Sidebar, Header, BalanceContext
│   ├── transactions/               # AddTransactionModal
│   └── investments/                # AddInvestmentModal
├── lib/                            # mongodb.ts, auth.ts, utils.ts
├── models/                         # User, Transaction, Investment (Mongoose)
└── types/                          # TypeScript interfaces
```
