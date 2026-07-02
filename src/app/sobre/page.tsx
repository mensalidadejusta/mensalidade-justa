import Link from "next/link";
import type { Metadata } from "next";

const A = (n: number) => String.fromCodePoint(n);

export const metadata: Metadata = {
  title: "Sobre o Mensalidade Justa | Transparencia",
  description: "Saiba como o Mensalidade Justa ajuda pais e alunos.",
};

export default function SobrePage() {
  return (
    <div className="min-h-dvh bg-[#f0f4f9] dark:bg-[#131314] transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/busca" className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors">
          {A(0x2190)} Voltar
        </Link>

        <main className="mt-6 space-y-8">
          <section className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-[#1f1f1f] dark:text-white">
              Mensalidade <span className="bg-gradient-to-r from-[#a855f7] via-[#3b82f6] to-[#f43f5e] bg-clip-text text-transparent">Justa</span>
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              Um projeto colaborativo para trazer transparencia aos valores
              das mensalidades escolares no Brasil.
            </p>
          </section>

          <div className="card space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{A(0x1F630)}</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">O problema</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {A(0x00C9)} uma informa{A(0x00E7)}{A(0x00E3)}o valiosa que fica escondida atr{A(0x00E1)}s do balc{A(0x00E3)}o da secretaria.
              As escolas divulgam os pre{A(0x00E7)}os de forma isolada. Cada pai paga o seu boleto e fica sem saber se o
              valor {A(0x00E9)} justo ou se est{A(0x00E1)} acima da m{A(0x00E9)}dia.
            </p>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{A(0x1F4A1)}</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">A nossa ideia</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Foi assim que nasceu o <strong>Mensalidade Justa</strong>. Uma plataforma colaborativa
              onde pais, m{A(0x00E3)}es e alunos compartilham anonimamente os valores de mensalidade,
              matr{A(0x00ED)}cula e material escolar.
            </p>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{A(0x1F465)}</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">Para quem {A(0x00E9)}?</h2>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">{A(0x1F91D)}</span>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-white">Pais e respons{A(0x00E1)}veis</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Na hora da matr{A(0x00ED)}cula ou rematr{A(0x00ED)}cula, tenha em m{A(0x00E3)}os os valores praticados por outras fam{A(0x00ED)}lias.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">{A(0x1F3EB)}</span>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-white">Quem est{A(0x00E1)} mudando de escola</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Pesquise por regi{A(0x00E3)}o, compare mensalidades e encontre a institui{A(0x00E7)}{A(0x00E3)}o que cabe no seu or{A(0x00E7)}amento.</p>
              </div>
            </div>
          </div>

          <div className="card space-y-3 border-blue-200/50 dark:border-blue-800/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{A(0x1F512)}</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">Privacidade total</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Seus dados s{A(0x00E3)}o <strong>100% an{A(0x00F4)}nimos</strong>. Nenhuma informa{A(0x00E7)}{A(0x00E3)}o pessoal {A(0x00E9)} exibida.
              Voc{A(0x00EA)} pode excluir sua conta a qualquer momento, em conformidade com a LGPD.
            </p>
          </div>

          <div className="card space-y-3 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{A(0x2696)}</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">Aviso importante</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              O <strong>Mensalidade Justa</strong> {A(0x00E9)} uma plataforma <strong>colaborativa</strong>.
              As informa{A(0x00E7)}{A(0x00F5)}es exibidas aqui foram fornecidas voluntariamente por usu{A(0x00E1)}rios
              e n{A(0x00E3)}o passaram por verifica{A(0x00E7)}{A(0x00E3)}o oficial das escolas.
              O site n{A(0x00E3)}o se responsabiliza pela veracidade ou atualidade dos valores.
            </p>
          </div>

          <div className="text-center pt-2 pb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Fa{A(0x00E7)}a parte dessa comunidade e ajude outros pais!
            </p>
            <Link href="/contribuir" className="inline-flex items-center gap-2 gradient-btn py-3 px-8 rounded-xl text-white font-medium hover:scale-105 transition-all active:scale-95">
              {A(0x270F)} Quero contribuir
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
