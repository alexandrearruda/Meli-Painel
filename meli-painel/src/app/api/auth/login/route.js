import { NextResponse } from "next/server";
import {
  buildAuthUrl,
  generateCodeVerifier,
  challengeFromVerifier,
} from "@/lib/meli";

// Opções comuns dos cookies temporários do fluxo OAuth.
// secure:true exige HTTPS — por isso é obrigatório acessar pela URL do túnel.
const cookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: "lax", // permite o cookie voltar no redirect do ML (navegação top-level GET)
  path: "/",
  maxAge: 600, // 10 min, tempo de sobra pra concluir o login
};

// GET /api/auth/login -> inicia o PKCE e manda o usuário autorizar no ML.
export async function GET() {
  try {
    const verifier = generateCodeVerifier();
    const challenge = challengeFromVerifier(verifier);
    const state = generateCodeVerifier(); // valor aleatório anti-CSRF

    const url = buildAuthUrl({ state, codeChallenge: challenge });

    const res = NextResponse.redirect(url);
    // Guardamos o verifier e o state pra usar no callback.
    res.cookies.set("meli_pkce_verifier", verifier, cookieOpts);
    res.cookies.set("meli_oauth_state", state, cookieOpts);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}