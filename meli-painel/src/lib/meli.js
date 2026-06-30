import { saveAccount, getActiveAccount } from "./tokens";

const API = "https://api.mercadolibre.com";

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

// ------------------------------------------------------------
// OAuth
// ------------------------------------------------------------

// URL pra onde mandamos o usuário autorizar o app.
export function buildAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env("MELI_CLIENT_ID"),
    redirect_uri: env("MELI_REDIRECT_URI"),
  });
  if (state) params.set("state", state);
  return `${env("MELI_AUTH_DOMAIN")}/authorization?${params.toString()}`;
}

// Troca o "code" recebido no callback por access/refresh token.
export async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env("MELI_CLIENT_ID"),
    client_secret: env("MELI_CLIENT_SECRET"),
    code,
    redirect_uri: env("MELI_REDIRECT_URI"),
  });

  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Falha no OAuth: ${data.message || JSON.stringify(data)}`);
  }
  return data; // { access_token, refresh_token, expires_in, user_id, ... }
}

// Usa o refresh_token pra obter um novo access_token.
async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env("MELI_CLIENT_ID"),
    client_secret: env("MELI_CLIENT_SECRET"),
    refresh_token: refreshToken,
  });

  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Falha ao renovar token: ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

// ------------------------------------------------------------
// Token válido (com refresh automático quando perto de expirar)
// ------------------------------------------------------------
async function getValidAccount() {
  const account = await getActiveAccount();
  if (!account) {
    const err = new Error("Nenhuma conta conectada. Faça login primeiro.");
    err.status = 401;
    throw err;
  }

  // Margem de 60s pra evitar usar um token que expira no meio da chamada.
  const expiresAt = new Date(account.expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) {
    return account;
  }

  // Token vencido ou quase: renova e persiste.
  const refreshed = await refreshAccessToken(account.refresh_token);
  return saveAccount({
    meliUserId: account.meli_user_id,
    nickname: account.nickname,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresIn: refreshed.expires_in,
  });
}

// fetch autenticado na API do ML. Renova o token e tenta de novo
// uma vez se o ML responder 401.
async function meliFetch(path, options = {}, retry = true) {
  const account = await getValidAccount();

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && retry) {
    // Força renovação salvando expiração no passado e tenta de novo.
    await saveAccount({
      meliUserId: account.meli_user_id,
      nickname: account.nickname,
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresIn: -3600,
    });
    return meliFetch(path, options, false);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Erro ${res.status} na API do ML`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// ------------------------------------------------------------
// Endpoints de negócio
// ------------------------------------------------------------

export function getMe(accessToken) {
  // Usado logo após o OAuth, antes de ter conta salva.
  return fetch(`${API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || "Falha ao buscar usuário");
    return d;
  });
}

// Lista os anúncios do seller logado (com detalhes de cada item).
export async function listItems({ limit = 20, offset = 0 } = {}) {
  const account = await getValidAccount();

  const search = await meliFetch(
    `/users/${account.meli_user_id}/items/search?limit=${limit}&offset=${offset}`
  );

  const ids = search.results || [];
  if (ids.length === 0) {
    return { total: search.paging?.total ?? 0, items: [] };
  }

  // multiget: detalhes de vários itens de uma vez, só com os campos úteis.
  const attrs = "id,title,price,available_quantity,status,permalink,thumbnail";
  const detail = await meliFetch(
    `/items?ids=${ids.join(",")}&attributes=${attrs}`
  );

  const items = detail
    .filter((d) => d.code === 200)
    .map((d) => d.body);

  return { total: search.paging?.total ?? items.length, items };
}

// Consulta pedidos recebidos pelo seller logado.
export async function listOrders({ limit = 20, offset = 0 } = {}) {
  const account = await getValidAccount();
  const data = await meliFetch(
    `/orders/search?seller=${account.meli_user_id}` +
      `&sort=date_desc&limit=${limit}&offset=${offset}`
  );
  return { total: data.paging?.total ?? 0, orders: data.results || [] };
}

// Atualiza estoque (available_quantity) de um anúncio.
export function updateStock(itemId, quantity) {
  return meliFetch(`/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ available_quantity: Number(quantity) }),
  });
}

// Altera o preço de um anúncio.
export function updatePrice(itemId, price) {
  return meliFetch(`/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ price: Number(price) }),
  });
}
