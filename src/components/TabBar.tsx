"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, LogIn, Map, Info } from "lucide-react";
import BotaoTema from "@/components/BotaoTema";
import { useAuth } from "@/lib/auth-context";

const authPaths = ["/login", "/cadastro", "/recuperar-senha", "/alterar-senha", "/atualizar-senha"];

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isAuth = authPaths.some((p) => pathname.startsWith(p));
  if (isAuth) return null;

  function handleMapToggle() {
    if (pathname === "/busca") {
      const params = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
      );
      if (params.get("map") === "1") params.delete("map");
      else params.set("map", "1");
      const qs = params.toString();
      router.push(qs ? `/busca?${qs}` : "/busca");
    } else {
      router.push("/busca?map=1");
    }
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-20">
      <div className="max-w-lg mx-auto flex items-center">
        <Link href="/sobre"
          className="flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors duration-300 gap-0.5 text-text-tertiary">
          <Info className="w-[18px] h-[18px]" />
          Info
        </Link>
        <div className="flex-1 flex flex-col items-center py-2 text-[10px] gap-0.5 text-text-tertiary">
          <BotaoTema />
          <span>Tema</span>
        </div>
        <button onClick={handleMapToggle}
          className={`flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors duration-300 gap-0.5 ${
            pathname === "/busca" ? "text-primary" : "text-text-tertiary"
          }`}
        >
          <Map className="w-[18px] h-[18px]" />
          Mapa
        </button>
        {user ? (
          <Link href="/perfil"
            className={`flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors duration-300 gap-0.5 ${pathname.startsWith("/perfil") ? "text-primary" : "text-text-tertiary"}`}>
            <User className="w-[18px] h-[18px]" />
            Perfil
          </Link>
        ) : (
          <Link href={`/login?redirectTo=${encodeURIComponent(pathname)}`}
            className="flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors duration-300 gap-0.5 text-text-tertiary">
            <LogIn className="w-[18px] h-[18px]" />
            Entrar
          </Link>
        )}
      </div>
    </nav>
  );
}
