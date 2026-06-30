import { NextResponse } from "next/server";
import { updateStock, updatePrice } from "@/lib/meli";

// PUT /api/items/:id
// body: { available_quantity?: number, price?: number }
// Aceita um dos dois ou ambos.
export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json().catch(() => ({}));

  if (body.available_quantity == null && body.price == null) {
    return NextResponse.json(
      { error: "Informe available_quantity e/ou price." },
      { status: 400 }
    );
  }

  try {
    let result;
    if (body.available_quantity != null) {
      result = await updateStock(id, body.available_quantity);
    }
    if (body.price != null) {
      result = await updatePrice(id, body.price);
    }
    return NextResponse.json({
      id: result.id,
      price: result.price,
      available_quantity: result.available_quantity,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, detalhe: err.body ?? null },
      { status: err.status || 500 }
    );
  }
}
