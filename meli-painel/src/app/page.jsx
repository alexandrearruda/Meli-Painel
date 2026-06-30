import Link from "next/link";
import { getActiveAccount } from "@/lib/tokens";

// Server Component: lê o estado da conexão direto do banco.
export default async function Home({ searchParams }) {
  let account = null;
  let dbError = null;

  try {
    account = await getActiveAccount();
  } catch (err) {
    dbError = err.message;
  }

  const erro = searchParams?.erro;
  const conectado = searchParams?.conectado;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Painel de integração</h1>
        <p>Gerencie seus anúncios do Mercado Livre direto daqui.</p>
      </div>

      {erro && (
        <div className="alert error">Erro ao conectar: {erro}</div>
      )}
      {conectado && (
        <div className="alert success">Conta conectada com sucesso.</div>
      )}
      {dbError && (
        <div className="alert error">
          Banco indisponível: {dbError}. Rode <code>npm run db:setup</code>.
        </div>
      )}

      <div className="status">
        <span className={`dot ${account ? "on" : "off"}`} />
        <div className="grow">
          {account ? (
            <>
              <strong>Conectado como {account.nickname || account.meli_user_id}</strong>
              <span>user_id {account.meli_user_id}</span>
            </>
          ) : (
            <>
              <strong>Nenhuma conta conectada</strong>
              <span>Autorize o app pra começar a usar o painel.</span>
            </>
          )}
        </div>
        <a className="btn" href="/api/auth/login">
          {account ? "Reconectar" : "Conectar com Mercado Livre"}
        </a>
      </div>

      <div className="grid">
        <Link className="tile" href="/anuncios">
          <div className="tile-ic">🏷️</div>
          <h3>Anúncios</h3>
          <p>Liste seus produtos e ajuste estoque e preço.</p>
        </Link>
        <Link className="tile" href="/pedidos">
          <div className="tile-ic">📦</div>
          <h3>Pedidos</h3>
          <p>Acompanhe os pedidos recebidos e o status de cada um.</p>
        </Link>
        <a
          className="tile"
          href="https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br"
          target="_blank"
          rel="noreferrer"
        >
          <div className="tile-ic">📚</div>
          <h3>Documentação</h3>
          <p>Referência oficial da API do Mercado Livre.</p>
        </a>
      </div>
    </div>
  );
}
