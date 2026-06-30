import { query } from "./db";

// Salva (ou atualiza) os tokens de uma conta após o OAuth ou um refresh.
export async function saveAccount({
  meliUserId,
  nickname,
  accessToken,
  refreshToken,
  expiresIn,
}) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const { rows } = await query(
    `INSERT INTO meli_accounts
        (meli_user_id, nickname, access_token, refresh_token, expires_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (meli_user_id) DO UPDATE SET
        nickname      = EXCLUDED.nickname,
        access_token  = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at    = EXCLUDED.expires_at,
        updated_at    = now()
     RETURNING *`,
    [meliUserId, nickname, accessToken, refreshToken, expiresAt]
  );

  return rows[0];
}

// Pega a conta mais recente conectada. Este projeto assume um único
// seller logado por vez (suficiente pro desafio). Pra multi-conta,
// daria pra receber o meli_user_id por sessão/cookie.
export async function getActiveAccount() {
  const { rows } = await query(
    `SELECT * FROM meli_accounts ORDER BY updated_at DESC LIMIT 1`
  );
  return rows[0] ?? null;
}
