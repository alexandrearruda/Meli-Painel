"use client";

import { useEffect, useState, useCallback } from "react";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusLabel = {
  active: "Ativo",
  paused: "Pausado",
  closed: "Encerrado",
};

export default function AnunciosPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState({}); // { [id]: { price, qty } }
  const [savingId, setSavingId] = useState(null);
  const [flash, setFlash] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/items?limit=50");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar anúncios");
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setDraft(id, field, value) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: value } }));
  }

  async function save(item) {
    const draft = drafts[item.id] || {};
    const payload = {};

    const newPrice = draft.price;
    const newQty = draft.qty;

    if (newPrice != null && Number(newPrice) !== item.price) {
      payload.price = Number(newPrice);
    }
    if (newQty != null && Number(newQty) !== item.available_quantity) {
      payload.available_quantity = Number(newQty);
    }

    if (Object.keys(payload).length === 0) {
      setFlash({ type: "error", msg: "Nada mudou nesse anúncio." });
      return;
    }

    setSavingId(item.id);
    setFlash(null);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar");

      // Atualiza a linha com o que o ML confirmou.
      setItems((list) =>
        list.map((it) =>
          it.id === item.id
            ? {
                ...it,
                price: data.price ?? it.price,
                available_quantity:
                  data.available_quantity ?? it.available_quantity,
              }
            : it
        )
      );
      setDrafts((d) => ({ ...d, [item.id]: {} }));
      setFlash({ type: "success", msg: `${item.id} atualizado.` });
    } catch (err) {
      setFlash({ type: "error", msg: err.message });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Anúncios</h1>
        <p>Ajuste estoque e preço e salve direto no Mercado Livre.</p>
      </div>

      <div className="toolbar">
        <span className="muted">
          {loading ? "Carregando…" : `${items.length} anúncio(s)`}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          Atualizar lista
        </button>
      </div>

      {flash && <div className={`alert ${flash.type}`}>{flash.msg}</div>}
      {error && <div className="alert error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="card empty">
          <div className="big">🏷️</div>
          Nenhum anúncio encontrado nesta conta.
        </div>
      )}

      {items.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Anúncio</th>
                <th className="hide-sm">Status</th>
                <th>Estoque</th>
                <th>Preço (R$)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const draft = drafts[item.id] || {};
                const dirty =
                  (draft.price != null && Number(draft.price) !== item.price) ||
                  (draft.qty != null &&
                    Number(draft.qty) !== item.available_quantity);
                return (
                  <tr key={item.id}>
                    <td>
                      {item.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={item.thumbnail} alt="" />
                      ) : (
                        <div className="thumb" />
                      )}
                    </td>
                    <td>
                      <div className="item-title">
                        <a href={item.permalink} target="_blank" rel="noreferrer">
                          {item.title}
                        </a>
                      </div>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {item.id}
                      </span>
                    </td>
                    <td className="hide-sm">
                      <span className={`badge ${item.status}`}>
                        {statusLabel[item.status] || item.status}
                      </span>
                    </td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={draft.qty ?? item.available_quantity}
                        onChange={(e) => setDraft(item.id, "qty", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.price ?? item.price}
                        onChange={(e) =>
                          setDraft(item.id, "price", e.target.value)
                        }
                      />
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {brl.format(item.price)}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => save(item)}
                        disabled={!dirty || savingId === item.id}
                      >
                        {savingId === item.id ? "Salvando…" : "Salvar"}
                      </button>
                    </td>
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
