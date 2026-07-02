"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ToggleTema from "./toggle-tema";

const tabs = [
  { href: "/busca", label: "Busca", icon: "\uD83D\uDD0D" },
  { href: "/contribuir", label: "Contribuir", icon: "\u270F\uFE0F" },
  { href: "/perfil", label: "Perfil", icon: "\uD83D\uDC64" },
];

const authPaths = ["/login", "/cadastro", "/recuperar-senha", "/alterar-senha"];

export default function TabBar() {
  const pathname = usePathname();
  const isAuth = authPaths.some((p) => pathname.startsWith(p));
  if (isAuth) return null;

  return (
    <>
      {/* Desktop: sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-16 flex-col items-center py-6 gap-6
                      border-r border-[var(--color-border)] bg-[var(--color-bg)] z-20">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all
                ${active ? "bg-[var(--color-surface)] shadow-sm" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"}`}
            >
              {tab.icon}
            </Link>
          );
        })}
        <div className="flex flex-col items-center gap-4 mt-auto">
          <Link href="/sobre"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] transition-all"
            title="Sobre">
            ?
          </Link>
          <ToggleTema />
        </div>
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav className="md:hidden sticky bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-20">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors
                  ${active ? "text-[var(--color-primary)]" : "text-[var(--color-text-tertiary)]"}`}
              >
                <span className="text-xl mb-0.5">{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
          <Link href="/sobre"
            className="flex items-center justify-center px-2 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors"
            title="Sobre">
            ?
          </Link>
        </div>
      </nav>
    </>
  );
}
