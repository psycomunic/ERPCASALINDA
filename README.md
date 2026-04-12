# ERP Casa Linda

Sistema de gestão de produção e pedidos para a Casa Linda Decorações.

## Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Estilo**: Tailwind CSS + Framer Motion
- **Backend/DB**: Supabase (PostgreSQL + Realtime)
- **Pedidos**: Magazord API (BasicAuth)
- **Hosting**: Vercel

---

## Desenvolvimento Local

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `VITE_MAGAZORD_BASE_URL` | `https://casalinda.magazord.com.br` |
| `VITE_MAGAZORD_USER` | Usuário da API Magazord |
| `VITE_MAGAZORD_PASS` | Senha da API Magazord |

### 3. Rodar o servidor
```bash
npm run dev
```

O Vite proxy (`/magazord-api/*`) injeta o BasicAuth automaticamente no dev server — sem expor credenciais ao browser.

---

## Deploy na Vercel

### Opção A — Via CLI
```bash
npx vercel --prod
```

### Opção B — GitHub (recomendado)
1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório `psycomunic/ERPCASALINDA`
3. O framework **Vite** é detectado automaticamente
4. Configure as variáveis de ambiente (passo abaixo)
5. Clique em **Deploy**

### Variáveis de Ambiente na Vercel

No painel: **Settings → Environment Variables**

Adicione **todas** estas variáveis (tanto as `VITE_` quanto as sem prefixo):

| Variável | Onde é usada |
|---|---|
| `VITE_SUPABASE_URL` | Browser (Supabase client) |
| `VITE_SUPABASE_ANON_KEY` | Browser (Supabase client) |
| `VITE_MAGAZORD_BASE_URL` | Browser (exibir URL no Settings) |
| `VITE_MAGAZORD_USER` | Browser (exibir usuário no Settings) |
| `MAGAZORD_BASE_URL` | **Serverless Function** (proxy seguro) |
| `MAGAZORD_USER` | **Serverless Function** (proxy seguro) |
| `MAGAZORD_PASS` | **Serverless Function** (proxy seguro) |

> ⚠️ `MAGAZORD_PASS` **nunca** deve ter prefixo `VITE_` — assim a senha fica 100% server-side.

### Como funciona o proxy em produção

```
Browser  →  /magazord-api/v2/pedido
            ↓  (vercel.json rewrite)
Vercel   →  /api/magazord/v2/pedido   (Serverless Function)
            ↓  (BasicAuth injetado server-side)
Magazord →  https://casalinda.magazord.com.br/api/v2/pedido
```

### Verificar deploy

Após o deploy, acesse:
```
https://seu-dominio.vercel.app/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "services": {
    "magazord": { "configured": true },
    "supabase": { "configured": true }
  }
}
```

---

## Supabase — Banco de Dados

Execute o script SQL inicial no **SQL Editor** do Supabase:

```
supabase/migration_001_initial.sql
```

---

## Estrutura do Projeto

```
├── api/
│   ├── health.ts                  # GET /api/health
│   └── magazord/
│       └── [...path].ts           # Proxy seguro para a API Magazord
├── src/
│   ├── lib/
│   │   ├── supabase.ts            # Client Supabase
│   │   └── database.types.ts      # Types gerados do schema
│   ├── services/                  # CRUD via Supabase
│   ├── pages/                     # Páginas do ERP
│   ├── magazord.ts                # Integração Magazord
│   └── ...
├── supabase/
│   └── migration_001_initial.sql  # Schema inicial
├── vercel.json                    # Config de deploy
└── .env.example                   # Template de variáveis
```
