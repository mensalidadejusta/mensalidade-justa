import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre o Mensalidade Justa | Transparência nas Mensalidades Escolares",
  description: "Saiba como o Mensalidade Justa ajuda pais e alunos a descobrir os valores reais de mensalidade e encontrar a escola ideal de forma colaborativa e anônima.",
};

export default function SobrePage() {
  return (
    <div className="min-h-dvh bg-[#f0f4f9] dark:bg-[#131314] transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/busca" className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors">
          ← Voltar para busca
        </Link>

        <main className="mt-6 space-y-8">
          {/* Header */}
          <section className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-[#1f1f1f] dark:text-white">
              Mensalidade <span className="bg-gradient-to-r from-[#a855f7] via-[#3b82f6] to-[#f43f5e] bg-clip-text text-transparent">Justa</span>
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              Um projeto colaborativo para trazer transparência aos valores 
              das mensalidades escolares no Brasil.
            </p>
          </section>

          {/* Card: The Problem */}
          <div className="card space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">😰</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">O problema</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Quem nunca ficou naquela dúvida na hora da matrícula? 
              "Será que essa mensalidade está cara?" "Quanto será que os outros pais estão pagando?"
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              As escolas divulgam os preços de forma isolada. Cada pai recebe um boleto, 
              paga o seu e fica sem saber se o valor é justo ou se está acima da média. 
              Não existe uma tabela pública que mostre o que as escolas realmente cobram.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              É uma informação valiosa que fica escondida atrás do balcão da secretaria.
            </p>
          </div>

          {/* Card: The Solution */}
          <div className="card space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">A nossa ideia</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              E se cada pai contribuísse com o valor que paga e todos pudessem ver os preços 
 praticados por cada escola?
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Foi assim que nasceu o <strong>Mensalidade Justa</strong>. Uma plataforma colaborativa 
              onde pais, mães e alunos compartilham anonimamente os valores de mensalidade, 
              matrícula e material escolar.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Quanto mais pessoas contribuem, mais precisa fica a informação 
              para toda a comunidade.
            </p>
          </div>

          {/* Card: Who is it for */}
          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">Para quem é?</h2>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">🤝</span>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-white">Pais e responsáveis</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Na hora da matrícula ou rematrícula, tenha em mãos os valores pr tica dos por 
                  outras famílias. Use essa informação para negociar com a escola e saber se o 
                  preço está dentro da média.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">🏫</span>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-white">Quem est mudando de escola</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Se mudou de cidade ou quer trocar seu filho de escola? 
                  Pesquise por região, compare mensalidades e encontre a instituição 
                  que cabe no seu or amento, sem sustos no final do mês.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">📊</span>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-white">Comunidade</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Quanto mais pessoas participam, mais justa fica a comparação 
                  para todos. O sucesso do projeto depende de cada contribuição.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Privacy */}
          <div className="card space-y-3 border-[#3b82f6]/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">Privacidade total</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Seus dados são <strong>100% an nimes</strong>. Nenhuma informa o pessoal 
              (nome, email, telefone)  exibida publicamente ou enviada para as escolas.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Pedimos apenas um cadastro simples com email para evitar que uma mesma pessoa 
              envie valores falsos repetidas vezes. Fora isso, sua identidade permanece 
              completamente oculta.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Voc  pode excluir sua conta e todos os seus dados a qualquer momento, 
              em conformidade com a LGPD.
            </p>
          </div>

          {/* Card: Disclaimer */}
          <div className="card space-y-3 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚖️</span>
              <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-white">Aviso importante</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              O <strong>Mensalidade Justa</strong>  uma plataforma <strong>colaborativa</strong>. 
              As informa es exibidas aqui foram fornecidas voluntariamente por usuários 
              e n o passaram por verifica o oficial das escolas.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              O site n o se responsabiliza pela veracidade, precis o ou atualidade dos 
              valores cadastrados. Recomendamos sempre confirmar os pre os diretamente 
              com a institui o de ensino.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Os dados aqui presentes t m carater meramente informativo e n o substituem 
              uma consulta oficial a escola.
            </p>
          </div>

          {/* CTA */}
          <div className="text-center pt-2 pb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Fa a parte dessa comunidade e ajude outros pais!
            </p>
            <Link href="/contribuir"
              className="inline-flex items-center gap-2 gradient-btn py-3 px-8 rounded-xl bg-gradient-to-r from-[#4285f4] to-[#8b5cf6] text-white font-medium hover:scale-105 transition-all active:scale-95">
              ✏️ Quero contribuir
            </Link>
          </div>

        </main>
      </div>
    </div>
  );
}
