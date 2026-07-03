"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Edit3, User, Info } from "lucide-react";

const tabs = [
  { href: "/busca", label: "Busca", icon: Search },
  { href: "/contribuir", label: "Contribuir", icon: Edit3 },
  { href: "/perfil", label: "Perfil", icon: User },
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
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300
                ${active ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-primary)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"}`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
        <div className="flex flex-col items-center gap-4 mt-auto">
          <Link href="/sobre"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] transition-all duration-300"
            title="Sobre o projeto">
            <Info className="w-5 h-5" />
          </Link>
        </div>
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav className="md:hidden sticky bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-20">
        <div className="max-w-lg mx-auto flex items-center">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors duration-300 gap-0.5
                  ${active ? "text-[var(--color-primary)]" : "text-[var(--color-text-tertiary)]"}`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {tab.label}
              </Link>
            );
          })}
          <Link href="/sobre"
            className="flex items-center justify-center w-10 h-10 text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors duration-300"
            title="Sobre o projeto">
            <Info className="w-[18px] h-[18px]" />
          </Link>
        </div>
      </nav>
    </>
  );
}
