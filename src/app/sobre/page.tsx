import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre o Mensalidade Justa | Transpar\u00eancia nas Mensalidades Escolares",
  description: "Saiba como o Mensalidade Justa ajuda pais e alunos a descobrir os valores reais de mensalidade.",
};

export default function SobrePage() {
  const emoji = (n: number) => String.fromCodePoint(n);
  return (
    <div className="min-h-dvh bg-[#f0f4f9] dark:bg-[#131314] transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/busca" className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors">
          {emoji(0x2190)} Voltar para busca
        </Link>

        <main className="mt-6 space-y-8">
          <section className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-[#1f1f1f] dark:text-white">
              Mensalidade <span className="bg-gradient-to-r from-[#a855f7] via-[#3b82f6] to-[#f43f5e] bg-clip-text text-transparent">Justa</span>
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              Um projeto colaborativo para trazer transpar\u00eancia aos valores das mensalidades escolares no Brasil.
            </p>
          </section>

          <div className="card space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{emoji(0x1F630)}</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">O problema</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Quem nunca ficou naquela d\u00favida na hora da matr\u00edcula? &quot;Ser\u00e1 que essa mensalidade est\u00e1 cara?&quot; &quot;Quanto ser\u00e1 que os outros pais est\u00e3o pagando?&quot;
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              As escolas divulgam os pre\u00e7os de forma isolada. Cada pai recebe um boleto, paga o seu e fica sem saber se o valor \u00e9 justo ou se est\u00e1 acima da m\u00e9dia.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              \u00c9 uma informa\u00e7\u00e3o valiosa que fica escondida atr\u00e1s do balc\u00e3o da secretaria.
            </p>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{emoji(0x1F4A1)}</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">A nossa ideia</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              E se cada pai contribu\u00edsse com o valor que paga e todos pudessem ver os pre\u00e7os praticados por cada escola?
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Foi assim que nasceu o <strong>Mensalidade Justa</strong>. Uma plataforma colaborativa onde pais, m\u00e3es e alunos compartilham anonimamente os valores de mensalidade, matr\u00edcula e material escolar.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Quanto mais pessoas contribuem, mais precisa fica a informa\u00e7\u00e3o para toda a comunidade.
            </p>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{emoji(0x1F465)}</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">Para quem \u00e9?</h2>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">{emoji(0x1F91D)}</span>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-white">Pais e respons\u00e1veis</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Na hora da matr\u00edcula ou rematr\u00edcula, tenha em m\u00e3os os valores praticados por outras fam\u00edlias. Use essa informa\u00e7\u00e3o para negociar com a escola.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">{emoji(0x1F3EB)}</span>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-white">Quem est\u00e1 mudando de escola</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Se mudou de cidade ou quer trocar seu filho de escola? Pesquise por regi\u00e3o, compare mensalidades e encontre a institui\u00e7\u00e3o que cabe no seu or\u00e7amento.</p>
              </div>
            </div>
          </div>

          <div className="card space-y-3 border-[#3b82f6]/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{emoji(0x1F512)}</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">Privacidade total</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Seus dados s\u00e3o <strong>100% an\u00f4nimos</strong>. Nenhuma informa\u00e7\u00e3o pessoal \u00e9 exibida publicamente ou enviada para as escolas.</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Voc\u00ea pode excluir sua conta e todos os seus dados a qualquer momento, em conformidade com a LGPD.</p>
          </div>

          <div className="card space-y-3 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{emoji(0x2696)}</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">Aviso importante</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">O <strong>Mensalidade Justa</strong> \u00e9 uma plataforma <strong>colaborativa</strong>. As informa\u00e7\u00f5es exibidas aqui foram fornecidas voluntariamente por usu\u00e1rios e n\u00e3o passaram por verifica\u00e7\u00e3o oficial das escolas.</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">O site n\u00e3o se responsabiliza pela veracidade, precis\u00e3o ou atualidade dos valores cadastrados. Os dados aqui presentes t\u00eam car\u00e1ter meramente informativo.</p>
          </div>

          <div className="text-center pt-2 pb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Fa\u00e7a parte dessa comunidade e ajude outros pais!</p>
            <Link href="/contribuir" className="inline-flex items-center gap-2 gradient-btn py-3 px-8 rounded-xl text-white font-medium hover:scale-105 transition-all active:scale-95">{emoji(0x270F)} Quero contribuir</Link>
          </div>
        </main>
      </div>
    </div>
  );
}