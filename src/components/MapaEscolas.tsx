"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase";
import { SERIES } from "@/lib/series";
import { makeEscolaSlug } from "@/lib/utils";

type SeriePreco = { serie_slug: string; serie_nome: string; valor_mensalidade: number | null; valor_matricula: number | null; valor_material: number | null; qtd: number };
type Escola = { id: number; nome: string; bairro: string | null; municipio: string; uf: string; latitude: number | null; longitude: number | null; dependencia_administrativa: string; codigo_inep: string; series_precos: SeriePreco[] };
type Props = { escolas: Escola[]; userLocation?: { lat: number; lon: number } | null; hoveredId?: number | null; serieSlug?: string; mapCenter?: { lat: number; lon: number } | null; activeTile?: string; onBoundsChange?: (bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number }) => void; showPrivada?: boolean; showPublica?: boolean; onZoomModeChange?: (mode: "estado" | "cidade" | "escola") => void };

type MediaEstado = { uf: string; latitude: number; longitude: number; media_mensalidade: number | null; total_escolas: number; publicas: number; privadas: number; total_infantil?: number; publicas_infantil?: number; privadas_infantil?: number; total_fundamental?: number; publicas_fundamental?: number; privadas_fundamental?: number; total_medio?: number; publicas_medio?: number; privadas_medio?: number };
type MediaCidade = { cidade_id: string; nome: string; uf: string; latitude: number; longitude: number; media_mensalidade: number | null; total_escolas: number; publicas: number; privadas: number; total_infantil?: number; publicas_infantil?: number; privadas_infantil?: number; total_fundamental?: number; publicas_fundamental?: number; privadas_fundamental?: number; total_medio?: number; publicas_medio?: number; privadas_medio?: number; distanciaCentro?: number };

const slugToGrupo = new Map<string, string>(SERIES.map((s) => [s.slug, s.grupo]));
const GRUPOS = [...new Set(SERIES.map((s) => s.grupo))];

function gruposDoFiltro(serieSlug?: string): Set<string> {
  if (!serieSlug) return new Set<string>();
  const slugs = serieSlug.split(",").filter(Boolean);
  const grupos = new Set<string>();
  for (const slug of slugs) {
    const g = slugToGrupo.get(slug);
    if (g) grupos.add(g);
  }
  return grupos;
}

function colunaPorGrupo(grupo: string): string {
  if (grupo.includes("Infantil")) return "infantil";
  if (grupo.includes("Fundamental")) return "fundamental";
  if (grupo.includes("M\u00e9dio") || grupo.includes("Medio")) return "medio";
  return "";
}

function contagensComFiltro(item: any, serieSlug?: string): { total: number; publicas: number; privadas: number } {
  const grupos = gruposDoFiltro(serieSlug);
  if (grupos.size === 0) {
    return { total: item.total_escolas ?? 0, publicas: item.publicas ?? 0, privadas: item.privadas ?? 0 };
  }
  let total = 0, pub = 0, priv = 0;
  for (const g of grupos) {
    const col = colunaPorGrupo(g);
    if (!col) continue;
    total += item[`total_${col}`] ?? 0;
    pub += item[`publicas_${col}`] ?? 0;
    priv += item[`privadas_${col}`] ?? 0;
  }
  return { total, publicas: pub, privadas: priv };
}

function slugsDoFiltro(serieSlug?: string): Set<string> {
  if (!serieSlug) return new Set<string>();
  return new Set(serieSlug.split(",").filter(Boolean));
}

function mediaPreco(e: Escola, serieSlug?: string): string {
  const slugs = slugsDoFiltro(serieSlug);
  const precos = (Array.isArray(e.series_precos) ? e.series_precos : [])
    .filter((s) => !serieSlug || slugs.has(s.serie_slug))
    .map((s) => s.valor_mensalidade)
    .filter((v): v is number => v != null);
  if (precos.length === 0) return "";
  const media = precos.reduce((a, b) => a + b, 0) / precos.length;
  return media >= 1000 ? `R$ ${(media / 1000).toFixed(1).replace(".0", "")}k` : `R$ ${Math.round(media)}`;
}

function fmtMedia(media: number | null): string {
  if (media == null) return "";
  return media >= 1000 ? `R$ ${(media / 1000).toFixed(1).replace(".0", "")}k` : `R$ ${Math.round(media)}`;
}

function calcDiameter(total: number, min: number, max: number): number {
  if (total <= 0) return min;
  const maxEscolas = 35000;
  const scale = Math.sqrt(Math.min(total, maxEscolas) / maxEscolas);
  return Math.round(min + scale * (max - min));
}

function calcCidadeDiameter(total: number): number {
  if (total <= 0) return 28;
  const min = 28, max = 64, maxEscolas = 2000;
  const scale = Math.sqrt(Math.min(total, maxEscolas) / maxEscolas);
  return Math.round(min + scale * (max - min));
}

export default function MapaEscolas({ escolas, userLocation, hoveredId, serieSlug, mapCenter, activeTile, onBoundsChange, showPrivada = true, showPublica = true, onZoomModeChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<any>(null);
  const aggMarkersRef = useRef<any>(null);
  const lastDataKey = useRef("");
  const lastBoundsKey = useRef("");
  const openPopupId = useRef<number | null>(null);
  const isInitialLoadOrFilterChange = useRef(true);
  const lastMapCenterKey = useRef("");
  const mediasEstado = useRef<MediaEstado[]>([]);
  const supabase = useRef(createClient());
  const userMarkerRef = useRef<any>(null);
  const modoVisaoAnteriorRef = useRef<'estado' | 'cidade' | 'escola'>('estado');
  const mediasCidade = useRef<MediaCidade[]>([]);
  const todasCidades = useRef<MediaCidade[]>([]);
  const cidadeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const escolaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderEstadoRef = useRef<(L: any, lg: any, m: any) => void>(() => {});
  const renderCidadeRef = useRef<(L: any, lg: any, m: any) => void>(() => {});
  const renderEscolaRef = useRef<(L: any, lg: any, a: boolean) => void>(() => {});
  const filtrarCidadesRef = useRef<(b: { minLat: number; minLon: number; maxLat: number; maxLon: number }) => void>(() => {});
  const { theme, resolvedTheme } = useTheme();
  const [temaAtual, setTemaAtual] = useState<string>("");

  function getZoomMode(z: number): "estado" | "cidade" | "escola" {
    if (z < 7) return "estado";
    if (z < 10) return "cidade";
    return "escola";
  }

  function buildKey() {
    const locKey = userLocation ? `${userLocation.lat.toFixed(4)}${userLocation.lon.toFixed(4)}` : "0";
    return `${escolas.length}-${locKey}`;
  }

  async function carregarMediasEstado() {
    const { data } = await supabase.current.rpc("obter_medias_estado");
    if (data) {
      mediasEstado.current = (data as any[]).map((r) => ({
        uf: r.uf,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        media_mensalidade: r.media_mensalidade != null ? Number(r.media_mensalidade) : null,
        total_escolas: r.total_escolas,
        publicas: r.publicas ?? 0,
        privadas: r.privadas ?? 0,
        total_infantil: r.total_infantil ?? 0,
        publicas_infantil: r.publicas_infantil ?? 0,
        privadas_infantil: r.privadas_infantil ?? 0,
        total_fundamental: r.total_fundamental ?? 0,
        publicas_fundamental: r.publicas_fundamental ?? 0,
        privadas_fundamental: r.privadas_fundamental ?? 0,
        total_medio: r.total_medio ?? 0,
        publicas_medio: r.publicas_medio ?? 0,
        privadas_medio: r.privadas_medio ?? 0,
      }));
    }
  }

  async function carregarMediasCidade() {
    const { data } = await supabase.current.rpc("obter_medias_cidade").limit(10000);
    if (!data) { todasCidades.current = []; return; }
    todasCidades.current = (data as any[]).map((r) => ({
      cidade_id: r.cidade_id,
      nome: r.nome,
      uf: r.uf,
      latitude: Number(r.latitude ?? r.lat),
      longitude: Number(r.longitude ?? r.lon ?? r.lng),
      media_mensalidade: r.media_mensalidade != null ? Number(r.media_mensalidade) : null,
      total_escolas: r.total_escolas,
      publicas: r.publicas ?? 0,
      privadas: r.privadas ?? 0,
      total_infantil: r.total_infantil ?? 0,
      publicas_infantil: r.publicas_infantil ?? 0,
      privadas_infantil: r.privadas_infantil ?? 0,
      total_fundamental: r.total_fundamental ?? 0,
      publicas_fundamental: r.publicas_fundamental ?? 0,
      privadas_fundamental: r.privadas_fundamental ?? 0,
      total_medio: r.total_medio ?? 0,
      publicas_medio: r.publicas_medio ?? 0,
      privadas_medio: r.privadas_medio ?? 0,
    })).filter((c) => c.latitude && c.longitude);
  }

  function filtrarCidadesPorBounds(bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number }) {
    const dentroBounds = todasCidades.current
      .filter((c) => c.latitude >= bounds.minLat && c.latitude <= bounds.maxLat && c.longitude >= bounds.minLon && c.longitude <= bounds.maxLon);
    if (dentroBounds.length > 0) {
      mediasCidade.current = dentroBounds;
    } else {
      const latCentro = (bounds.minLat + bounds.maxLat) / 2;
      const lonCentro = (bounds.minLon + bounds.maxLon) / 2;
      mediasCidade.current = todasCidades.current
        .map((c) => ({ ...c, distanciaCentro: (c.latitude - latCentro) ** 2 + (c.longitude - lonCentro) ** 2 }))
        .sort((a, b) => a.distanciaCentro - b.distanciaCentro)
        .slice(0, 200);
    }
  }

  function renderEstadoMarkers(L: any, layerGroup: any, activeMap: any) {
    if (!layerGroup || !activeMap) return;
    layerGroup.clearLayers();
    const posicoes: Array<{ x: number; y: number }> = [];
    for (const e of mediasEstado.current) {
      const c = contagensComFiltro(e, serieSlug);
      const totalAtivo =
        !showPrivada && !showPublica ? 0
        : showPrivada && !showPublica ? c.privadas
        : !showPrivada && showPublica ? c.publicas
        : c.publicas + c.privadas;
      if (totalAtivo <= 0) continue;
      const p: [number, number] = [e.latitude, e.longitude];
      const px = activeMap.latLngToLayerPoint(L.latLng(e.latitude, e.longitude));
      const colide = posicoes.some((p2) => Math.abs(px.x - p2.x) < 90 && Math.abs(px.y - p2.y) < 40);
      if (colide) continue;
      posicoes.push({ x: px.x, y: px.y });
      const diametro = calcDiameter(totalAtivo, 32, 80);
      const totalTexto = totalAtivo >= 1000 ? `${(totalAtivo / 1000).toFixed(1).replace(".0", "")}k` : String(totalAtivo);
      const bgEstilo = showPrivada && showPublica
        ? "linear-gradient(135deg,#0070F3,#34A853)"
        : showPrivada ? "#0070F3" : "#34A853";
      const icon = L.divIcon({
        className: "",
        iconSize: null,
        html: `<div style="width:${diametro}px;height:${diametro}px;font-family:system-ui,-apple-system,sans-serif;background:${bgEstilo};border:1px solid #222" class="rounded-full flex flex-col items-center justify-center text-white text-center"><span class="font-bold text-sm leading-none">${e.uf}</span><span class="text-[10px] font-bold leading-tight mt-0.5">${totalTexto}</span></div>`,
      });
      const m = L.marker(p, { icon });
      layerGroup.addLayer(m);
    }
  }

  function renderCidadeMarkers(L: any, layerGroup: any, activeMap: any) {
    if (!layerGroup || !activeMap) return;
    layerGroup.clearLayers();
    const posicoes: Array<{ x: number; y: number }> = [];
    for (const c of mediasCidade.current) {
      if (!c.latitude || !c.longitude) continue;
      const p: [number, number] = [c.latitude, c.longitude];
      const px = activeMap.latLngToLayerPoint(L.latLng(c.latitude, c.longitude));
      const colide = posicoes.some((p2) => Math.abs(px.x - p2.x) < 70 && Math.abs(px.y - p2.y) < 30);
      if (colide) continue;
      posicoes.push({ x: px.x, y: px.y });
      const cnt = contagensComFiltro(c, serieSlug);
      const totalAtivo =
        !showPrivada && !showPublica ? 0
        : showPrivada && !showPublica ? cnt.privadas
        : !showPrivada && showPublica ? cnt.publicas
        : cnt.publicas + cnt.privadas;
      if (totalAtivo <= 0) continue;
      const diametro = calcCidadeDiameter(totalAtivo);
      const countTexto = totalAtivo >= 1000 ? `${(totalAtivo / 1000).toFixed(1).replace(".0", "")}k` : String(totalAtivo);
      const bgEstilo = showPrivada && showPublica
        ? "linear-gradient(135deg,#0070F3,#34A853)"
        : showPrivada ? "#0070F3" : "#34A853";
      const nomeCurto = c.nome.length > 12 ? c.nome.slice(0, 11) + "\u2026" : c.nome;
      const icon = L.divIcon({
        className: "",
        iconSize: null,
        html: `<div style="width:${diametro}px;height:${diametro}px;font-family:system-ui,-apple-system,sans-serif;background:${bgEstilo};border:1px solid #222" class="rounded-full flex flex-col items-center justify-center text-white text-center"><span class="font-bold text-xs leading-tight">${countTexto}</span></div>`,
      });
      const m = L.marker(p, { icon });
      m.bindPopup(`<div style="font-family:sans-serif;padding:2px;color:#1e293b"><strong style="font-size:13px">${c.nome} - ${c.uf}</strong><br/><span style="font-size:12px">${totalAtivo > 0 ? "M\u00e9dia: R$ " + (c.media_mensalidade != null ? Math.round(Number(c.media_mensalidade)) : "-") : "Sem escolas cadastradas"}</span><br/><span style="font-size:11px;color:#64748b">Escolas ativas: ${totalAtivo}</span></div>`);
      layerGroup.addLayer(m);
    }
  }

  function renderEscolaMarkers(L: any, layerGroup: any, ajustarCamera: boolean) {
    const escolasArray = Array.isArray(escolas) ? escolas : [];
    let todas = escolasArray.filter((e) => e.latitude && e.longitude);
    const privadas = todas.filter((e) => e.dependencia_administrativa === "Privada");
    const publicas = todas.filter((e) => e.dependencia_administrativa !== "Privada");
    const privadasOrd = [...privadas.filter((e) => mediaPreco(e, serieSlug)), ...privadas.filter((e) => !mediaPreco(e, serieSlug))].slice(0, 100);
    const publicasOrd = [...publicas.filter((e) => mediaPreco(e, serieSlug)), ...publicas.filter((e) => !mediaPreco(e, serieSlug))].slice(0, 100);
    const selecionadas = [...privadasOrd, ...publicasOrd];

    const bounds = L.latLngBounds([]);

    for (const e of selecionadas) {
      const p: [number, number] = [e.latitude!, e.longitude!];
      bounds.extend(p);
      const priv = e.dependencia_administrativa === "Privada";
      const color = priv ? "#0070F3" : "#34A853";
      const preco = priv ? mediaPreco(e, serieSlug) : "";
      const h = hoveredId === e.id;
      const m = L.circleMarker(p, { radius: h ? 10 : 7, fillColor: color, color: "#222", weight: h ? 1.5 : 1, fillOpacity: h ? 0.95 : 0.85 });
      m._eid = e.id;
      const endereco = e.bairro || "";
      const slugsAtivos = slugsDoFiltro(serieSlug);
      let precosHtml = "";
      const precosArray = Array.isArray(e.series_precos) ? e.series_precos : [];
      if (precosArray.length) {
        if (serieSlug && slugsAtivos.size > 0) {
          const items = precosArray.filter((sp) => slugsAtivos.has(sp.serie_slug));
          for (const item of items) {
            const valor = Number(item.valor_mensalidade);
            if (isNaN(valor)) continue;
            precosHtml += `<div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;line-height:1.7"><span style="font-weight:600">${item.serie_nome}</span><span style="font-weight:700;color:var(--color-price-text);white-space:nowrap">R$ ${valor.toLocaleString("pt-BR")}</span></div>`;
          }
        } else {
          for (const grupo of GRUPOS) {
            const items = precosArray.filter((sp) => slugToGrupo.get(sp.serie_slug) === grupo);
            if (!items.length) continue;
            const precos = items.map((s) => Number(s.valor_mensalidade)).filter((v) => !isNaN(v));
            const min = precos.length > 0 ? Math.min(...precos) : 0;
            const max = precos.length > 0 ? Math.max(...precos) : 0;
            const qtd = items.reduce((s, it) => s + it.qtd, 0);
            const label = grupo.replace("Educa\u00e7\u00e3o Infantil", "Infantil").replace("Ensino M\u00e9dio", "Ens. M\u00e9dio").replace("Ensino ", "");
            const faixa = min === max ? `R$ ${min.toLocaleString("pt-BR")}` : `R$ ${min.toLocaleString("pt-BR")} - R$ ${max.toLocaleString("pt-BR")}`;
            precosHtml += `<div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;line-height:1.7"><span><span style="font-weight:600">${label}</span> <span style="color:var(--color-text-tertiary);font-size:10px">(${qtd})</span></span><span style="font-weight:700;color:var(--color-price-text);white-space:nowrap">${faixa}</span></div>`;
          }
        }
      } else if (!priv) {
        precosHtml = `<div style="font-size:11px;color:#34d399;font-weight:600">Gratuito</div>`;
      } else {
        precosHtml = `<div style="font-size:11px;color:#888">Sem mensalidades cadastradas</div>`;
      }
      const slug = makeEscolaSlug(e.codigo_inep, e.nome);
      m.bindPopup(`
        <div style="font-family:sans-serif;max-width:300px;background:var(--color-surface);color:var(--color-text);border-radius:12px;padding:8px 12px">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px">${e.nome}</div>
          ${endereco ? `<div style="font-size:11px;color:var(--color-text-tertiary);margin-bottom:6px">${endereco}</div>` : ""}
          ${precosHtml}
          <a href="/escola/${slug}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:6px;padding:6px 0;background:var(--color-surface-hover);border-radius:8px;text-align:center;font-size:12px;font-weight:600;color:var(--color-primary);text-decoration:none">Ver detalhes</a>
        </div>
      `, { offset: [0, -8], maxWidth: 320, className: "school-popup", closeOnClick: false });
      if (preco) {
        const tooltipHtml = `<span style="color:var(--color-price-text);font-weight:700;font-size:11px">${preco}</span>`;
        m.bindTooltip(tooltipHtml, { permanent: true, direction: "top", offset: [0, -12], className: "price-tip" });
        m.on("popupopen", () => { openPopupId.current = e.id; if (m._tooltip) m.closeTooltip(); });
        m.on("popupclose", () => { openPopupId.current = null; m.bindTooltip(tooltipHtml, { permanent: true, direction: "top", offset: [0, -12], className: "price-tip" }); });
      } else {
        m.on("popupopen", () => { openPopupId.current = e.id; });
        m.on("popupclose", () => { openPopupId.current = null; });
      }
      layerGroup.addLayer(m);
    }

    if (ajustarCamera && isInitialLoadOrFilterChange.current && bounds.isValid()) {
      if (selecionadas.length === 1 && !userLocation) state.current.map.flyTo([selecionadas[0].latitude!, selecionadas[0].longitude!], 14, { duration: 2 });
      else state.current.map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 2 });
      isInitialLoadOrFilterChange.current = false;
    }
  }

  function renderUserLocation(L: any, map: any) {
    if (!userLocation) {
      if (userMarkerRef.current) {
        if (userMarkerRef.current._int) clearInterval(userMarkerRef.current._int);
        if (userMarkerRef.current._pulse) map.removeLayer(userMarkerRef.current._pulse);
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }
    const p: [number, number] = [userLocation.lat, userLocation.lon];
    if (userMarkerRef.current) {
      if (userMarkerRef.current._int) clearInterval(userMarkerRef.current._int);
      if (userMarkerRef.current._pulse) map.removeLayer(userMarkerRef.current._pulse);
      map.removeLayer(userMarkerRef.current);
    }
    const um = L.circleMarker(p, { radius: 12, fillColor: "#4285f4", color: "#fff", weight: 3, fillOpacity: 0.9 });
    um.bindTooltip("Voc\u00ea");
    um.addTo(map);
    const pulse = L.circleMarker(p, { radius: 18, fillColor: "#4285f4", color: "transparent", fillOpacity: 0.2 });
    pulse.addTo(map);
    let r = 14;
    const int = setInterval(() => { r += 0.5; pulse.setRadius(r); pulse.setStyle({ fillOpacity: Math.max(0, 0.25 - (r - 14) * 0.02) }); if (r > 30) r = 14; }, 40);
    userMarkerRef.current = um;
    userMarkerRef.current._pulse = pulse;
    userMarkerRef.current._int = int;
  }

  function renderizar() {
    const s = state.current;
    if (!s) return;
    const { map, L, markers } = s;
    const z = map.getZoom();
    const modo = getZoomMode(z);

    markers.clearLayers();
    if (aggMarkersRef.current) aggMarkersRef.current.clearLayers();

    if (modo === "estado") {
      renderEstadoMarkers(L, aggMarkersRef.current, map);
    } else if (modo === "cidade") {
      renderCidadeMarkers(L, aggMarkersRef.current, map);
    } else {
      renderEscolaMarkers(L, markers, false);
    }
    modoVisaoAnteriorRef.current = modo;
    onZoomModeChange?.(modo);

    renderUserLocation(L, map);
  }

  function handleMapMoveTelemetria(e: any) {
    const s = state.current;
    if (!s) return;
    const { L } = s;
    const activeMap = e.target;
    const currentZoom = activeMap.getZoom();
    const limites = activeMap.getBounds();
    const bounds = { minLat: limites.getSouth(), minLon: limites.getWest(), maxLat: limites.getNorth(), maxLon: limites.getEast() };

    if (openPopupId.current !== null) return;

    const modoAtual = currentZoom < 7 ? "estado" : currentZoom < 10 ? "cidade" : "escola";

    // Re-render markers on mode change
    if (modoAtual !== modoVisaoAnteriorRef.current) {
      if (s.markers) s.markers.clearLayers();

      if (modoAtual === "estado") {
        if (aggMarkersRef.current) aggMarkersRef.current.clearLayers();
        renderEstadoRef.current?.(L, aggMarkersRef.current, activeMap);
      } else if (modoAtual === "cidade") {
        if (aggMarkersRef.current) aggMarkersRef.current.clearLayers();
        filtrarCidadesRef.current?.(bounds);
        renderCidadeRef.current?.(L, aggMarkersRef.current, activeMap);
      } else {
        renderEscolaRef.current?.(L, s.markers, false);
      }
      modoVisaoAnteriorRef.current = modoAtual;
      onZoomModeChange?.(modoAtual);
    }

    // Debounced re-filter on pan/zoom within cidade mode
    if (modoAtual === "cidade") {
      if (cidadeDebounceRef.current) clearTimeout(cidadeDebounceRef.current);
      cidadeDebounceRef.current = setTimeout(() => {
        filtrarCidadesRef.current?.(bounds);
        renderCidadeRef.current?.(L, aggMarkersRef.current, activeMap);
      }, 300);
    }

    // Fetch schools on every pan/zoom within escola mode (debounced 500ms)
    if (modoAtual === "escola") {
      const key = `${bounds.minLat.toFixed(3)}-${bounds.minLon.toFixed(3)}-${bounds.maxLat.toFixed(3)}-${bounds.maxLon.toFixed(3)}`;
      if (key !== lastBoundsKey.current) {
        lastBoundsKey.current = key;
        if (escolaDebounceRef.current) clearTimeout(escolaDebounceRef.current);
        escolaDebounceRef.current = setTimeout(() => {
          onBoundsChange?.(bounds);
        }, 500);
      }
    }
  }

  useEffect(() => {
    if (!el.current || state.current) return;
    (async () => {
      try {
        const mod = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        const L = mod.default || mod;
        const map = L.map(el.current!, { zoomControl: false, closePopupOnClick: false }).setView([-15.8, -47.9], 4);
        // Force size recalculation after render (critical for mobile)
        setTimeout(() => map.invalidateSize(), 300);
        map.on("resize", () => map.invalidateSize());

        const tiles: Record<string, any> = {
          "Padr\u00e3o": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }),
          "Sat\u00e9lite": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "&copy; Esri", maxZoom: 19 }),
          "Terreno": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenTopoMap", maxZoom: 17 }),
          "Claro": L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "&copy; CARTO", maxZoom: 19 }),
          "Escuro": L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "&copy; CARTO", maxZoom: 19 }),
        };

        tiles["Padr\u00e3o"].addTo(map);

        // Separate ref for the aggregation layer to avoid stale closures
        if (!aggMarkersRef.current) {
          aggMarkersRef.current = L.layerGroup().addTo(map);
        }

        state.current = {
          map, L,
          markers: L.layerGroup().addTo(map),
          aggMarkers: aggMarkersRef.current,
        };

        // Load aggregated data
        await carregarMediasEstado();
        await carregarMediasCidade();
        renderizar();

        map.on("zoomend moveend", handleMapMoveTelemetria);

        // Fechar popup apenas em clique real (sem arrasto)
        let dragging = false;
        map.on("dragstart", () => { dragging = true; });
        map.on("dragend", () => { setTimeout(() => { dragging = false; }, 500); });
        map.on("click", () => { if (!dragging) map.closePopup(); });
      } catch (e) {
        console.error("MapaEscolas init error:", e);
      }
    })();
    return () => {
      if (state.current) {
        state.current.map.off("zoomend moveend", handleMapMoveTelemetria);
      }
      if (cidadeDebounceRef.current) clearTimeout(cidadeDebounceRef.current);
      if (escolaDebounceRef.current) clearTimeout(escolaDebounceRef.current);
    };
  }, []);

  // Re-render aggregated markers when theme changes (Leaflet outside React cycle)
  useEffect(() => {
    if (!state.current || !aggMarkersRef.current) return;
    const t = resolvedTheme ?? theme;
    if (t === temaAtual) return;
    setTemaAtual(t ?? "");
    const zoom = state.current.map.getZoom();
    const modo = getZoomMode(zoom);
    if (aggMarkersRef.current) aggMarkersRef.current.clearLayers();
    if (modo === "estado") {
      renderEstadoMarkers(state.current.L, aggMarkersRef.current, state.current.map);
    } else if (modo === "cidade") {
      renderCidadeMarkers(state.current.L, aggMarkersRef.current, state.current.map);
    }
    modoVisaoAnteriorRef.current = modo;
  }, [resolvedTheme, theme]);

  // Re-render markers when props or filters change
  useEffect(() => {
    const s = state.current;
    if (!s) return;
    const modo = getZoomMode(s.map.getZoom());
    if (modo === "escola") {
      renderizar();
      if (openPopupId.current !== null) {
        s.markers.eachLayer((layer: any) => {
          if (layer._eid === openPopupId.current && layer.getPopup) {
            const p = layer.getPopup();
            if (p && !p.isOpen()) layer.openPopup();
          }
        });
      }
    } else {
      if (aggMarkersRef.current) aggMarkersRef.current.clearLayers();
      if (modo === "estado") {
        renderEstadoMarkers(s.L, aggMarkersRef.current, s.map);
      } else {
        renderCidadeMarkers(s.L, aggMarkersRef.current, s.map);
      }
      renderUserLocation(s.L, s.map);
    }
  }, [escolas, userLocation, hoveredId, serieSlug, showPrivada, showPublica]);

  useEffect(() => {
    if (!mapCenter || !state.current) return;
    const key = `${mapCenter.lat.toFixed(4)}-${mapCenter.lon.toFixed(4)}`;
    if (key === lastMapCenterKey.current) return;
    lastMapCenterKey.current = key;
    isInitialLoadOrFilterChange.current = true;
    state.current.map.flyTo([mapCenter.lat, mapCenter.lon], 14, { duration: 2 });
  }, [mapCenter]);

  useEffect(() => {
    const s = state.current;
    if (!s || !activeTile) return;
    const { map, L } = s;
    map.eachLayer((layer: any) => {
      if (layer._url && layer._leaflet_id) map.removeLayer(layer);
    });
    const tileMap: Record<string, string> = {
      "Padr\u00e3o": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "Sat\u00e9lite": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      "Terreno": "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      "Claro": "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      "Escuro": "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    };
    const url = tileMap[activeTile];
    if (url) L.tileLayer(url, { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
  }, [activeTile]);

  renderEstadoRef.current = renderEstadoMarkers;
  renderCidadeRef.current = renderCidadeMarkers;
  renderEscolaRef.current = renderEscolaMarkers;
  filtrarCidadesRef.current = filtrarCidadesPorBounds;

  return <div ref={el} className="w-full h-full rounded-xl z-0" />;
}
