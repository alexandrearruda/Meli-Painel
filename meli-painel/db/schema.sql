-- ============================================================
-- Tabela de contas conectadas via OAuth do Mercado Livre.
-- Guarda os tokens por usuário (seller). Uma linha por conta ML.
-- ============================================================
CREATE TABLE IF NOT EXISTS meli_accounts (
    id              BIGSERIAL PRIMARY KEY,
    -- user_id do Mercado Livre (vem do /users/me)
    meli_user_id    BIGINT      NOT NULL UNIQUE,
    nickname        TEXT,
    access_token    TEXT        NOT NULL,
    refresh_token   TEXT        NOT NULL,
    -- momento em que o access_token expira (agora + expires_in)
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meli_accounts_user
    ON meli_accounts (meli_user_id);
