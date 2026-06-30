import "./globals.css";
import Nav from "./nav";

export const metadata = {
  title: "Painel Mercado Livre",
  description: "Integração com a API do Mercado Livre: OAuth, anúncios, pedidos, estoque e preço.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand">
              <span className="brand-dot">ML</span>
              Painel
            </div>
            <Nav />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
