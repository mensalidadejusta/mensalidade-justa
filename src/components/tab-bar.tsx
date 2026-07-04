"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Edit3, User, Info } from "lucide-react";

const tabs = [
  { href: "/busca", label: "Busca", icon: Search },
  { href: "/contribuir", label: "Contribuir", icon: Edit3 },
  { href: "/perfil", label: "Perfil", icon: User },
  { href: "/sobre", label: "Sobre", icon: Info },
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
                      border-r border-border bg-bg z-20">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300
                ${active ? "bg-surface shadow-sm text-primary" : "text-text-tertiary hover:text-text hover:bg-surface-hover"}`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
        <div className="flex flex-col items-center gap-3 mt-auto">
          <Link href="/sobre"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
              pathname === "/sobre" ? "bg-surface shadow-sm text-primary" : "text-text-tertiary hover:text-primary hover:bg-surface-hover"
            }`}
            title="Sobre o projeto">
            <Info className="w-5 h-5" />
          </Link>
          <span className="text-[9px] text-text-tertiary/30 select-none" title={process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev'}>
            {(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7)}
          </span>
        </div>
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav className="md:hidden sticky bottom-0 bg-surface border-t border-border z-20">
        <div className="max-w-lg mx-auto flex items-center">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href) || (tab.href === "/sobre" && pathname === "/sobre");
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors duration-300 gap-0.5
                  ${active ? "text-primary" : "text-text-tertiary"}`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
