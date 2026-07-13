import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import ThemeProvider from "@/providers/theme-provider";
import TabBar from "@/components/TabBar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Mensalidade Justa",
  description: "Busque escolas e compare mensalidades com transparência",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-dvh md:pl-16">
        <ThemeProvider>
          <AuthProvider>
            <div className="flex-1 flex flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <TabBar />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
