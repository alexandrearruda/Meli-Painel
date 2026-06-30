"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Início" },
  { href: "/anuncios", label: "Anúncios" },
  { href: "/pedidos", label: "Pedidos" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={path === l.href ? "active" : ""}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
