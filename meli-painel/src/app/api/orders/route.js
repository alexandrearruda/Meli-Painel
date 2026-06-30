import { NextResponse } from "next/server";
import { exchangeCodeForToken, getMe } from "@/lib/meli";
import { saveAccount } from "@/lib/tokens";

function redirectErro(origin, msg) {
  return NextResponse.redirect(`${origin}/?erro=${encodeURIComponent(msg)}`);
}

// GET /api/auth/callback?code=...&state=... -> o ML redireciona pra cá.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error) return redirectErro(origin, error);
  if (!code) return redirectErro(origin, "code_ausente");

  // Recupera o que guardamos no início do fluxo (PKCE + anti-CSRF).
  const verifier = request.cookies.get("meli_pkce_verifier")?.value;
  const savedState = request.cookies.get("meli_oauth_state")?.value;

  if (!verifier) {
    return redirectErro(origin, "pkce_verifier_ausente");
  }
  if (savedState && state && savedState !== state) {
    return redirectErro(origin, "state_invalido");
  }

  try {
    const token = await exchangeCodeForToken(code, verifier);
    const me = await getMe(token.access_token);

    await saveAccount({
      meliUserId: token.user_id ?? me.id,
      nickname: me.nickname,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
    });

    const res = NextResponse.redirect(`${origin}/?conectado=1`);
    // Limpa os cookies temporários: já cumpriram o papel.
    res.cookies.delete("meli_pkce_verifier");
    res.cookies.delete("meli_oauth_state");
    return res;
  } catch (err) {
    return redirectErro(origin, err.message);
  }
}