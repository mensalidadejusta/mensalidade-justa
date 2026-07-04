import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import TabBar from "@/components/tab-bar";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Mensalidade Justa",
  description: "Busque escolas e compare mensalidades com transparência",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-dvh md:pl-16">
        <AuthProvider>
          <div className="flex-1 flex flex-col">
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <TabBar />
        </AuthProvider>
      </body>
    </html>
  );
}
