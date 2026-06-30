"use client";

import { useEffect, useState, useCallback } from "react";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusMap = {
  paid: { cls: "paid", label: "Pago" },
  confirmed: { cls: "pending", label: "Confirmado" },
  payment_required: { cls: "pending", label: "Aguard. pagamento" },
  payment_in_process: { cls: "pending", label: "Processando" },
  cancelled: { cls: "cancelled", label: "Cancelado" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PedidosPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders?limit=50");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar pedidos");
      setOrders(data.orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Pedidos</h1>
        <p>Pedidos recebidos na sua conta, do mais recente pro mais antigo.</p>
      </div>

      <div className="toolbar">
        <span className="muted">
          {loading ? "Carregando…" : `${orders.length} pedido(s)`}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          Atualizar lista
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="card empty">
          <div className="big">📦</div>
          Nenhum pedido encontrado nesta conta.
        </div>
      )}

      {orders.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Produto(s)</th>
                <th className="hide-sm">Comprador</th>
                <th>Status</th>
                <th>Total</th>
                <th className="hide-sm">Data</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const first = o.order_items?.[0];
                const extra = (o.order_items?.length || 0) - 1;
                const st = statusMap[o.status] || {
                  cls: "pending",
                  label: o.status,
                };
                return (
                  <tr key={o.id}>
                    <td className="muted">#{o.id}</td>
                    <td>
                      <div className="item-title">
                        {first?.item?.title || "—"}
                      </div>
                      {extra > 0 && (
                        <span className="muted" style={{ fontSize: 12 }}>
                          + {extra} item(ns)
                        </span>
                      )}
                    </td>
                    <td className="hide-sm muted">
                      {o.buyer?.nickname || "—"}
                    </td>
                    <td>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td>
                      {o.total_amount != null
                        ? brl.format(o.total_amount)
                        : "—"}
                    </td>
                    <td className="hide-sm muted">{fmtDate(o.date_created)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
