# Painel Mercado Livre

Pequeno projeto **Next.js + React + Node + PostgreSQL** que integra com a API do
Mercado Livre e cobre o roteiro do desafio:

- ✅ **OAuth** (autorização + troca de code por token + refresh automático)
- ✅ **Lista anúncios** do seller logado
- ✅ **Consulta pedidos** recebidos
- ✅ **Atualiza estoque** (`available_quantity`)
- ✅ **Altera preço** (`price`)

O Next.js faz os dois papéis: **frontend React** (App Router) e **backend Node**
(Route Handlers em `src/app/api/*`). Os tokens ficam no **PostgreSQL**.

---

## Stack

| Camada      | Tecnologia                          |
| ----------- | ----------------------------------- |
| Frontend    | React 18 + Next.js 14 (App Router)  |
| Backend     | Route Handlers (Node) do Next.js    |
| Banco       | PostgreSQL (driver `pg`)            |
| Auth        | OAuth 2.0 do Mercado Livre          |

---

## 1. Criar o app no Mercado Livre

1. Acesse o [DevCenter](https://developers.mercadolivre.com.br/devcenter) e crie uma aplicação.
2. Anote o **App ID** (client_id) e o **Secret Key** (client_secret).
3. Em **Redirect URI**, cadastre exatamente:
   `http://localhost:3000/api/auth/callback`

> O ML exige que o Redirect URI seja idêntico ao que vai no `.env`.

## 2. Configurar o ambiente

```bash
cp .env.example .env
# edite o .env com seu CLIENT_ID, CLIENT_SECRET e a string do Postgres
```

Variáveis (ver `.env.example`):

- `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET`
- `MELI_REDIRECT_URI` — igual ao cadastrado no app
- `MELI_AUTH_DOMAIN` — `https://auth.mercadolivre.com.br` (contas Brasil)
- `DATABASE_URL` — conexão do PostgreSQL

## 3. Subir o banco

Com um PostgreSQL rodando, crie a tabela de tokens:

```bash
npm install
npm run db:setup
```

Isso roda `db/schema.sql` (tabela `meli_accounts`).

## 4. Rodar

```bash
npm run dev
```

Abra `http://localhost:3000`, clique em **Conectar com Mercado Livre**,
autorize, e o painel já lista anúncios e pedidos.

---

## Fluxo OAuth (resumo)

```
Usuário → GET /api/auth/login
       → redirect p/ auth.mercadolivre.com.br/authorization
       → usuário autoriza
       → ML redireciona p/ GET /api/auth/callback?code=...
       → troca code por access_token + refresh_token  (POST /oauth/token)
       → busca /users/me e salva tudo no Postgres
       → redireciona p/ "/" já conectado
```

O **refresh é automático**: antes de cada chamada autenticada, o client
(`src/lib/meli.js`) checa a validade do `access_token` e renova via
`refresh_token` quando falta menos de 60s pra expirar (ou se a API responder 401).

---

## Endpoints da API interna

| Método | Rota                  | O que faz                                  |
| ------ | --------------------- | ------------------------------------------ |
| GET    | `/api/auth/login`     | Inicia o OAuth (redirect pro ML)           |
| GET    | `/api/auth/callback`  | Recebe o code, gera tokens e salva         |
| GET    | `/api/items`          | Lista anúncios do seller                   |
| PUT    | `/api/items/:id`      | Atualiza `available_quantity` e/ou `price` |
| GET    | `/api/orders`         | Lista pedidos recebidos                    |

Exemplo de atualização:

```bash
# muda estoque e preço de um anúncio
curl -X PUT http://localhost:3000/api/items/MLB123456789 \
  -H "Content-Type: application/json" \
  -d '{ "available_quantity": 10, "price": 79.90 }'
```

---

## Endpoints do Mercado Livre usados

| Ação            | Endpoint ML                                   |
| --------------- | --------------------------------------------- |
| Token / refresh | `POST /oauth/token`                           |
| Usuário         | `GET /users/me`                               |
| Anúncios (IDs)  | `GET /users/{user_id}/items/search`           |
| Detalhe (multi) | `GET /items?ids=...&attributes=...`           |
| Pedidos         | `GET /orders/search?seller={user_id}`         |
| Estoque / preço | `PUT /items/{item_id}`                         |

---

## Estrutura

```
src/
├── app/
│   ├── layout.jsx          cabeçalho + navegação
│   ├── nav.jsx             menu com rota ativa
│   ├── page.jsx            início (status da conexão)
│   ├── anuncios/page.jsx   lista + edição de estoque/preço
│   ├── pedidos/page.jsx    lista de pedidos
│   ├── globals.css         estilos
│   └── api/                backend (Route Handlers)
│       ├── auth/login      inicia OAuth
│       ├── auth/callback   troca code por token
│       ├── items           lista anúncios
│       ├── items/[id]      atualiza estoque/preço
│       └── orders          lista pedidos
└── lib/
    ├── db.js               pool do PostgreSQL
    ├── tokens.js           salvar/ler tokens no banco
    └── meli.js             client da API ML (OAuth + refresh + endpoints)
```

## Observações

- O projeto assume **um seller conectado por vez** (pega a conta mais recente do
  banco). Pra multi-conta, bastaria amarrar o `meli_user_id` a uma sessão/cookie.
- Em produção, troque os redirects HTTP por HTTPS e configure o Redirect URI
  correspondente no app do ML.
- Os tokens ficam em texto no banco pra simplificar o desafio; num cenário real,
  vale criptografar em repouso.
