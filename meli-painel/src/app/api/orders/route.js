import { NextResponse } from "next/server";
import { listOrders } from "@/lib/meli";

// GET /api/orders?limit=20&offset=0 -> pedidos do seller.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);

  try {
    const data = await listOrders({ limit, offset });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 500 }
    );
  }
}
