import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/meli";

// GET /api/auth/login -> manda o usuário pra tela de autorização do ML.
export async function GET() {
  try {
    const url = buildAuthUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
