import { NextResponse } from "next/server";
import { listItems } from "@/lib/meli";

// GET /api/items?limit=20&offset=0 -> lista anúncios do seller.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);

  try {
    const data = await listItems({ limit, offset });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 500 }
    );
  }
}
