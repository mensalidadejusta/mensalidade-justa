import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, Lightbulb, Users, ShieldCheck, AlertTriangle, ArrowLeft, Pencil } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre o Mensalidade Justa | Transparencia",
  description: "Saiba como o Mensalidade Justa ajuda pais e alunos.",
};

const A = (n: number) => String.fromCodePoint(n);

export default function SobrePage() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link
          href="/busca"
          className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <main>
          {/* Hero */}
          <section className="text-center mb-12">
            <h1 className="text-2xl md:text-4xl font-bold text-text tracking-tight mb-4">
              Mensalidade{" "}
              <span className="bg-gradient-to-r from-primary via-purple to-coral bg-clip-text text-transparent">
                Justa
              </span>
            </h1>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto">
              Um projeto colaborativo para trazer transpar{A(0x00EA)}ncia aos valores das mensalidades escolares no Brasil.
            </p>
          </section>

          {/* Problema + Ideia */}
          <div className="md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0 mb-10">
            <section className="bg-surface border border-border rounded-xl p-5 md:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-coral/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-coral" />
                </div>
                <h2 className="text-lg font-semibold text-text">O Problema</h2>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {A(0x00C9)} uma informa{A(0x00E7)}{A(0x00E3)}o valiosa que fica escondida atr{A(0x00E1)}s do balc{A(0x00E3)}o da secretaria.
                As escolas divulgam os pre{A(0x00E7)}os de forma isolada. Cada pai paga o seu boleto e fica sem saber se o
                valor {A(0x00E9)} justo ou se est{A(0x00E1)} acima da m{A(0x00E9)}dia.
              </p>
            </section>

            <section className="bg-surface border border-border rounded-xl p-5 md:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-text">A Nossa Ideia</h2>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                Foi assim que nasceu o <strong>Mensalidade Justa</strong>. Uma plataforma colaborativa
                onde pais, m{A(0x00E3)}es e alunos compartilham anonimamente os valores de mensalidade,
                matr{A(0x00ED)}cula e material escolar.
              </p>
            </section>
          </div>

          {/* Para quem é? */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-purple/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-purple" />
              </div>
              <h2 className="text-lg font-semibold text-text">Para quem {A(0x00E9)}?</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface border border-border rounded-xl p-5 space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-text">Pais e respons{A(0x00E1)}veis</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Na hora da matr{A(0x00ED)}cula ou rematr{A(0x00ED)}cula, tenha em m{A(0x00E3)}os os valores praticados por outras fam{A(0x00ED)}lias.
                </p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5 space-y-2">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-success" />
                </div>
                <h3 className="text-sm font-semibold text-text">Quem est{A(0x00E1)} mudando de escola</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Pesquise por regi{A(0x00E3)}o, compare mensalidades e encontre a institui{A(0x00E7)}{A(0x00E3)}o que cabe no seu or{A(0x00E7)}amento.
                </p>
              </div>
            </div>
          </section>

          {/* Privacidade */}
          <section className="bg-surface border border-border rounded-xl p-5 md:p-6 space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-success" />
              </div>
              <h2 className="text-lg font-semibold text-text">Privacidade total</h2>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Seus dados s{A(0x00E3)}o <strong>100% an{A(0x00F4)}nimos</strong>. Nenhuma informa{A(0x00E7)}{A(0x00E3)}o pessoal {A(0x00E9)} exibida.
              Voc{A(0x00EA)} pode excluir sua conta a qualquer momento, em conformidade com a LGPD.
            </p>
          </section>

          {/* Aviso importante */}
          <section className="border border-border/60 rounded-xl p-4 md:p-5 space-y-3 mb-10 bg-surface/50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-text-tertiary shrink-0" />
              <h2 className="text-sm font-semibold text-text-secondary">Aviso importante</h2>
            </div>
            <p className="text-xs md:text-sm text-text-tertiary leading-relaxed">
              O <strong>Mensalidade Justa</strong> {A(0x00E9)} uma plataforma <strong>colaborativa</strong>.
              As informa{A(0x00E7)}{A(0x00F5)}es exibidas aqui foram fornecidas voluntariamente por usu{A(0x00E1)}rios
              e n{A(0x00E3)}o passaram por verifica{A(0x00E7)}{A(0x00E3)}o oficial das escolas.
              O site n{A(0x00E3)}o se responsabiliza pela veracidade ou atualidade dos valores.
            </p>
          </section>

          {/* CTA */}
          <section className="text-center">
            <p className="text-base text-text-secondary mb-5">
              Fa{A(0x00E7)}a parte dessa comunidade e ajude outros pais!
            </p>
            <Link
              href="/contribuir"
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold py-3 px-8 rounded-xl hover:brightness-110 transition-all duration-200 active:scale-95 shadow-sm"
            >
              <Pencil className="w-4 h-4" />
              Quero contribuir
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}
