# Tutorial — Painel Mercado Livre (do zero ao GitHub)

Guia completo pra configurar o ambiente, rodar o projeto **meli-painel**
(Next.js + React + Node + PostgreSQL) e publicar no GitHub.

Tempo estimado: ~40 min (a maior parte é instalar ferramentas e criar o app no ML).

**Roteiro**

1. Pré-requisitos
2. Instalar as ferramentas (Node, PostgreSQL, Git)
3. Criar o app no Mercado Livre (credenciais OAuth)
4. Preparar o projeto
5. Configurar o banco de dados
6. Configurar as variáveis de ambiente
7. Rodar e testar
8. Criar o repositório Git e publicar no GitHub
9. Solução de problemas

---

## 1. Pré-requisitos

Você vai precisar de:

- **Node.js 18.18+ ou 20+** (o Next.js 14 exige no mínimo 18.18)
- **PostgreSQL 14+**
- **Git**
- Uma **conta no Mercado Livre** (de vendedor, pra ter anúncios/pedidos)
- Um editor de código (VS Code recomendado)

> Dica: se você não tem anúncios reais pra testar, dá pra criar itens de teste
> usando uma conta de teste do Mercado Livre (veja a seção 9).

---

## 2. Instalar as ferramentas

### 2.1 Node.js

A forma mais tranquila de gerenciar versões do Node é com o **nvm**.

**Linux / macOS:**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# feche e reabra o terminal, depois:
nvm install 20
nvm use 20
```

**Windows:** instale o [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
ou baixe o Node 20 LTS direto em [nodejs.org](https://nodejs.org).

Confirme:

```bash
node -v   # deve mostrar v20.x (ou >= 18.18)
npm -v
```

### 2.2 PostgreSQL

**Ubuntu / Debian:**

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

**macOS (Homebrew):**

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Windows:** baixe o instalador em
[postgresql.org/download/windows](https://www.postgresql.org/download/windows/).
Anote a senha do usuário `postgres` que você definir.

> Alternativa rápida (qualquer SO, se você usa Docker):
> ```bash
> docker run --name pg-meli -e POSTGRES_PASSWORD=postgres \
>   -p 5432:5432 -d postgres:16
> ```

Confirme:

```bash
psql --version
```

### 2.3 Git

**Ubuntu / Debian:** `sudo apt install -y git`
**macOS:** `brew install git` (ou já vem com as Xcode Command Line Tools)
**Windows:** [git-scm.com/download/win](https://git-scm.com/download/win)

Configure seu nome e e-mail (uma vez só, vale pra todos os repositórios):

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
git config --global init.defaultBranch main
```

---

## 3. Criar o app no Mercado Livre

Sem isso o OAuth não funciona — é aqui que você pega o `client_id` e o `secret`.

1. Acesse o **DevCenter**: <https://developers.mercadolivre.com.br/devcenter>
2. Faça login e clique em **Criar aplicação**.
3. Preencha nome e descrição.
4. Em **URIs de redirect (Redirect URI)**, cadastre a URL do seu túnel HTTPS
   (veja **3.1** abaixo) com o caminho do callback. Exemplo:

   ```
   https://seu-dominio.ngrok-free.app/api/auth/callback
   ```

   > ⚠️ O DevCenter **exige HTTPS** e **não aceita `localhost`** (dá o erro
   > "O endereço deve ser válido"). Por isso usamos um túnel público — passo 3.1.
   > Esse valor precisa ser **idêntico** ao que vai no `.env`. Qualquer diferença
   > (barra a mais, http vs https, subdomínio) quebra o login.

5. Em **Tópicos/permissões (scopes)**, marque pelo menos leitura e escrita de
   itens e leitura de pedidos (`read` e `write` / `offline_access` pra ter
   refresh token).
6. Deixe **PKCE desligado** (o projeto não usa). Se ligar, o fluxo precisaria de
   `code_challenge`/`code_verifier`.
7. Salve. Anote:
   - **App ID** → será o `MELI_CLIENT_ID`
   - **Secret Key** → será o `MELI_CLIENT_SECRET`

### 3.1 Túnel HTTPS para o localhost (ngrok)

Como o ML não aceita `localhost`, exponha sua porta 3000 por um túnel HTTPS
público com o **ngrok**:

```bash
# instale e autentique (token no painel do ngrok)
npm install -g ngrok
ngrok config add-authtoken SEU_TOKEN

# abra o túnel (com o projeto rodando em outra aba via npm run dev)
ngrok http 3000
```

O ngrok mostra algo como:

```
Forwarding  https://a1b2-c3d4.ngrok-free.app -> http://localhost:3000
```

Use `https://a1b2-c3d4.ngrok-free.app/api/auth/callback` no passo 4 e no `.env`.

> **Dica:** a URL grátis muda a cada reinício. Pegue um **domínio estático
> grátis** no painel do ngrok e rode `ngrok http --url=seu-dominio.ngrok-free.app 3000`
> pra não ter que recadastrar o redirect toda vez. Alternativa: Cloudflare Tunnel
> (`cloudflared tunnel --url http://localhost:3000`).
>
> Importante: ao testar, **acesse o app pela URL do ngrok**, não por `localhost:3000`.

---

## 4. Preparar o projeto

### Opção A — você já tem o `meli-painel.zip`

```bash
unzip meli-painel.zip
cd meli-painel
```

### Opção B — começar de uma pasta vazia

Crie a estrutura e cole os arquivos do projeto (ver README do projeto), depois:

```bash
cd meli-painel
```

### Instalar as dependências

```bash
npm install
```

Isso instala Next.js, React e o driver `pg` do PostgreSQL.

---

## 5. Configurar o banco de dados

### 5.1 Criar o banco

Conecte no PostgreSQL e crie um banco pro projeto:

```bash
# entra no psql como o usuário postgres
sudo -u postgres psql      # Linux
# ou: psql -U postgres     # macOS/Windows/Docker
```

Dentro do `psql`:

```sql
CREATE DATABASE meli_painel;
\q
```

### 5.2 Rodar o schema

O projeto já traz um script que cria a tabela de tokens (`meli_accounts`).
Ele lê a `DATABASE_URL` do `.env`, então faça o passo 6 antes — ou rode depois
de configurar o `.env`:

```bash
npm run db:setup
```

Saída esperada: `Banco pronto: tabela meli_accounts criada.`

---

## 6. Configurar as variáveis de ambiente

Copie o exemplo e edite:

```bash
cp .env.example .env
```

Abra o `.env` e preencha:

```ini
# Credenciais do app no Mercado Livre (passo 3)
MELI_CLIENT_ID=seu_app_id
MELI_CLIENT_SECRET=seu_client_secret

# Tem que ser IGUAL ao Redirect URI cadastrado no app (a URL do ngrok do passo 3.1)
MELI_REDIRECT_URI=https://seu-dominio.ngrok-free.app/api/auth/callback

# Domínio de autenticação (contas Brasil)
MELI_AUTH_DOMAIN=https://auth.mercadolivre.com.br

# Conexão do PostgreSQL — ajuste usuário/senha/porta/banco
DATABASE_URL=postgres://postgres:postgres@localhost:5432/meli_painel
```

> ⚠️ **Nunca** suba o `.env` pro Git. Ele tem segredos. O `.gitignore` do projeto
> já ignora esse arquivo — confirme na seção 8.

Se você ainda não rodou o schema, rode agora:

```bash
npm run db:setup
```

---

## 7. Rodar e testar

```bash
npm run dev          # terminal 1: sobe o Next na porta 3000
ngrok http 3000      # terminal 2: abre o túnel HTTPS (passo 3.1)
```

Abra a **URL do ngrok** (ex.: `https://seu-dominio.ngrok-free.app`), **não** o
`localhost:3000` — senão o redirect do OAuth não bate com o que foi cadastrado.

### Testar o fluxo completo

1. **OAuth** — clique em **Conectar com Mercado Livre**. Você vai pra tela de
   autorização do ML, autoriza, e volta pro painel já conectado (status verde).
2. **Anúncios** — vá em **Anúncios**. Deve listar seus itens com estoque e preço.
3. **Estoque / preço** — mude o número de estoque ou o preço de um item e clique
   em **Salvar**. A linha atualiza com o valor confirmado pelo ML.
4. **Pedidos** — vá em **Pedidos** pra ver os pedidos recebidos.

### Testar a API direto (opcional)

```bash
# listar anúncios
curl http://localhost:3000/api/items

# atualizar estoque e preço de um anúncio
curl -X PUT http://localhost:3000/api/items/MLB123456789 \
  -H "Content-Type: application/json" \
  -d '{ "available_quantity": 10, "price": 79.90 }'
```

---

## 8. Criar o repositório Git e publicar no GitHub

### 8.1 Conferir o `.gitignore`

Antes de tudo, garanta que segredos e lixo não vão pro repositório. O projeto já
inclui um `.gitignore` com:

```
node_modules
.next
.env
.env.local
*.log
.DS_Store
```

Confirme que o `.env` está listado (o `.env.example`, sim, pode e deve ir).

### 8.2 Inicializar o repositório local

Na raiz do projeto:

```bash
git init
git add .
git status            # confira que o .env NÃO aparece na lista
git commit -m "feat: painel de integração com a API do Mercado Livre"
```

> Se o `.env` aparecer no `git status`, pare e ajuste o `.gitignore` antes de
> commitar. Se já tiver commitado por engano:
> `git rm --cached .env && git commit -m "chore: remove .env do versionamento"`

### 8.3 Criar o repositório no GitHub

**Forma A — pelo site (mais simples):**

1. Acesse <https://github.com/new>.
2. Nome: `meli-painel`. Deixe **sem** README/`.gitignore`/licença (o projeto já tem).
3. Clique em **Create repository**.
4. Conecte o repositório local ao remoto e suba:

   ```bash
   git remote add origin https://github.com/SEU_USUARIO/meli-painel.git
   git branch -M main
   git push -u origin main
   ```

**Forma B — pela linha de comando (GitHub CLI):**

```bash
# instale a gh uma vez: https://cli.github.com
gh auth login                       # autentica no GitHub
gh repo create meli-painel --public --source=. --remote=origin --push
```

Isso cria o repo e já faz o push em um comando só.

### 8.4 Fluxo de commits dali pra frente

```bash
git add .
git commit -m "descrição da mudança"
git push
```

> Boas mensagens de commit (padrão Conventional Commits) ajudam num portfólio:
> `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

---

## 9. Solução de problemas

| Sintoma | Causa provável | Como resolver |
| --- | --- | --- |
| "O endereço deve ser válido" ao cadastrar o redirect | ML exige HTTPS e não aceita `localhost` | Use um túnel HTTPS público (ngrok) e cadastre a URL dele — passo 3.1. |
| `invalid_grant` / erro no callback | Redirect URI diferente | O `MELI_REDIRECT_URI` do `.env` tem que ser **idêntico** ao cadastrado no app (inclusive http/https, subdomínio e barra final). |
| Volta do login com `?erro=...` | App sem permissão de `offline_access` ou code expirado | Reautorize; confira os scopes do app no DevCenter. |
| `ECONNREFUSED` / `Banco indisponível` | PostgreSQL parado ou `DATABASE_URL` errada | Suba o Postgres e confira usuário/senha/porta/banco na `DATABASE_URL`. |
| `relation "meli_accounts" does not exist` | Schema não foi aplicado | Rode `npm run db:setup`. |
| `error: unsupported Node version` | Node < 18.18 | `nvm install 20 && nvm use 20`. |
| Lista de anúncios vazia | Conta sem itens publicados | Use uma conta com anúncios, ou crie itens de teste (abaixo). |
| `.env` apareceu no GitHub | Não estava no `.gitignore` na hora do commit | `git rm --cached .env`, commit, e **troque o secret** no DevCenter por garantia. |

### Conta e itens de teste no Mercado Livre

Pra testar sem mexer na sua loja real, crie **usuários de teste** pela API do ML
(precisa de um access token do seu app). Os usuários de teste têm anúncios e
pedidos simulados, ideais pra desenvolvimento. Referência:
<https://developers.mercadolivre.com.br/pt_br/realizar-testes>.

---

## Próximos passos (bônus pra portfólio)

- **Webhooks/notificações** do ML pra receber pedido novo em tempo real.
- **Multi-conta**: amarrar o `meli_user_id` a uma sessão/cookie em vez de pegar a
  conta mais recente do banco.
- **Criptografar os tokens** em repouso no banco.
- **Deploy**: subir na Vercel (frontend + rotas) com um Postgres gerenciado
  (Neon, Supabase ou Railway) e atualizar o Redirect URI pra URL de produção.

Pronto — ambiente configurado, projeto rodando e versionado no GitHub. 🚀