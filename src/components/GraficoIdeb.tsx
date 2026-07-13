"use client";

import { useState } from "react";

type IdebData = {
  ano: number;
  ideb: number | null;
  meta_ideb: number | null;
  aprovacao: number | null;
  nota_saeb: number | null;
};

type Linha = {
  id: string;
  label: string;
  data: IdebData[];
};

type Props = {
  linhas: Linha[];
};

const CORES = ["#1a73e8", "#34a853", "#ea4335", "#9333ea", "#f59e0b"];

function PontosSvg({ pontos, cor, dashed }: { pontos: { x: number; y: number }[]; cor: string; dashed: boolean }) {
  if (pontos.length < 2) return null;
  const d = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return (
    <>
      <path d={d} fill="none" stroke={cor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={dashed ? "6,4" : "none"} opacity={0.8} />
      {pontos.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={cor} stroke="var(--color-bg)" strokeWidth={1.5} />
      ))}
    </>
  );
}

export default function GraficoIdeb({ linhas }: Props) {
  const [visiveis, setVisiveis] = useState<Record<string, boolean>>(() => {
    const obj: Record<string, boolean> = {};
    linhas.forEach((l) => { obj[l.id] = true; });
    return obj;
  });

  const ativas = linhas.filter((l) => visiveis[l.id]);

  const todosAnos = [...new Set(linhas.flatMap((l) => l.data.map((d) => d.ano)))].sort((a, b) => a - b);
  const todosIdeb = linhas.flatMap((l) => l.data.map((d) => d.ideb).filter((v): v is number => v != null));
  const todasMetas = linhas.flatMap((l) => l.data.map((d) => d.meta_ideb).filter((v): v is number => v != null));
  const maxValor = Math.max(...todosIdeb, ...todasMetas, 10);

  const pad = { t: 28, r: 24, b: 36, l: 36 };
  const viewW = 640;
  const viewH = 300;
  const chartW = viewW - pad.l - pad.r;
  const chartH = viewH - pad.t - pad.b;
  const stepX = chartW / Math.max(todosAnos.length - 1, 1);

  function xPos(ano: number) {
    const idx = todosAnos.indexOf(ano);
    return pad.l + idx * stepX;
  }
  function yPos(val: number) {
    return pad.t + chartH - (val / maxValor) * chartH;
  }

  const linhasGrafico = ativas.map((linha, idx) => {
    const cor = CORES[idx % CORES.length];
    const pontos: { x: number; y: number }[] = [];
    const pontosMeta: { x: number; y: number }[] = [];
    for (const d of linha.data) {
      const x = xPos(d.ano);
      if (d.ideb != null) pontos.push({ x, y: yPos(d.ideb) });
      if (d.meta_ideb != null) pontosMeta.push({ x, y: yPos(d.meta_ideb) });
    }
    return { id: linha.id, label: linha.label, cor, pontos, pontosMeta };
  });

  return (
    <div className="bg-surface border border-border/60 rounded-2xl p-4 md:p-6 shadow-sm">
      <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Indicadores de qualidade (IDEB)</h3>
      <p className="text-[10px] md:text-xs text-text-tertiary mb-4">Clique nas legendas para ativar/desativar cada etapa</p>

      {/* SVG */}
      {ativas.length > 0 && (
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {[0, 2, 4, 6, 8, 10].filter((v) => v <= maxValor).map((v) => {
          const y = yPos(v);
          return (
            <g key={v}>
              <line x1={pad.l} y1={y} x2={viewW - pad.r} y2={y} stroke="var(--color-border)" strokeWidth={0.5} />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fill="var(--color-text-tertiary)" fontSize={10}>{v}</text>
            </g>
          );
        })}

        {linhasGrafico.map((lg) => (
          <g key={lg.id}>
            <PontosSvg pontos={lg.pontos} cor={lg.cor} dashed={false} />
            <PontosSvg pontos={lg.pontosMeta} cor={lg.cor} dashed={true} />
          </g>
        ))}

        {todosAnos.map((ano) => (
          <text key={ano} x={xPos(ano)} y={viewH - 8} textAnchor="middle" fill="var(--color-text-tertiary)" fontSize={10}>{ano}</text>
        ))}
      </svg>
      )}

      {/* Legendas clicáveis */}
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {linhas.map((l, idx) => {
          const cor = CORES[idx % CORES.length];
          const ativa = visiveis[l.id];
          return (
            <button
              key={l.id}
              onClick={() => setVisiveis((prev) => ({ ...prev, [l.id]: !prev[l.id] }))}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-medium transition-all cursor-pointer
                ${ativa ? "opacity-100" : "opacity-40 line-through"}`}
              style={{ backgroundColor: `${cor}15`, color: cor }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cor }} />
              {l.label}
            </button>
          );
        })}
      </div>

      {/* Tabela completa */}
      {ativas.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-[10px] md:text-xs text-text-secondary">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-1.5 pr-3 font-semibold text-text">Ano</th>
                {ativas.map((l) => (
                  <th key={l.id} className="text-right py-1.5 px-2 font-semibold text-text">{l.label}</th>
                ))}
                {ativas.some((l) => l.data.some((d) => d.meta_ideb != null)) && ativas.map((l) => (
                  <th key={`m-${l.id}`} className="text-right py-1.5 pl-2 font-semibold text-text-tertiary">{l.label} (meta)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todosAnos.map((ano) => (
                <tr key={ano} className="border-b border-border/10 last:border-0">
                  <td className="py-1.5 pr-3 font-medium text-text">{ano}</td>
                  {ativas.map((l) => {
                    const d = l.data.find((dd) => dd.ano === ano);
                    return <td key={l.id} className="text-right py-1.5 px-2">{d?.ideb != null ? d.ideb.toFixed(1) : "—"}</td>;
                  })}
                  {ativas.some((l) => l.data.some((dd) => dd.meta_ideb != null)) && ativas.map((l) => {
                    const d = l.data.find((dd) => dd.ano === ano);
                    return <td key={`m-${l.id}`} className="text-right py-1.5 pl-2 text-text-tertiary">{d?.meta_ideb != null ? d.meta_ideb.toFixed(1) : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
