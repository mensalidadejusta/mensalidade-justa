"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/busca", label: "Busca", icon: "🔍" },
  { href: "/contribuir", label: "Contribuir", icon: "✏️" },
  { href: "/perfil", label: "Perfil", icon: "👤" },
];

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 overflow-y-auto pb-2">{children}</main>

      <nav className="sticky bottom-0 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors
                  ${active ? "text-primary" : "text-gray-400 hover:text-gray-600"}`}
              >
                <span className="text-xl mb-0.5">{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
