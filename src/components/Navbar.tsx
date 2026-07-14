"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sun, Moon, User, LogIn, School } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (pathname === "/busca") return null;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-bg/80 border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/busca" className="flex items-center gap-2 text-text font-bold text-base hover:text-primary transition-colors">
          <School className="w-5 h-5 text-primary" />
          Mensalidade Justa
        </Link>
        <div className="flex items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-hover hover:bg-border transition-all text-text-secondary hover:text-text"
              title="Alternar tema"
            >
              <span className={`inline-block transition-transform duration-300 ${theme === "dark" ? "rotate-0" : "rotate-90"}`}>
                {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </span>
            </button>
          )}
          {user ? (
            <Link
              href="/perfil"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white hover:brightness-110 transition-all"
              title="Perfil"
            >
              <User className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href={`/login?redirectTo=${encodeURIComponent(pathname)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium text-text hover:bg-surface-hover transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
