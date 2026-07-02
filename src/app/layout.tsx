import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Mensalidade Justa",
  description: "Busque escolas e compare mensalidades com transparência",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
