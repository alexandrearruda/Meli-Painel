import { NextResponse } from "next/server";
import { exchangeCodeForToken, getMe } from "@/lib/meli";
import { saveAccount } from "@/lib/tokens";

// GET /api/auth/callback?code=... -> o ML redireciona pra cá.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/?erro=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/?erro=code_ausente`);
  }

  try {
    const token = await exchangeCodeForToken(code);
    const me = await getMe(token.access_token);

    await saveAccount({
      meliUserId: token.user_id ?? me.id,
      nickname: me.nickname,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
    });

    return NextResponse.redirect(`${origin}/?conectado=1`);
  } catch (err) {
    return NextResponse.redirect(
      `${origin}/?erro=${encodeURIComponent(err.message)}`
    );
  }
}
