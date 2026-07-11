"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase";
import { SERIES } from "@/lib/series";
import { makeEscolaSlug } from "@/lib/utils";

type SeriePreco = { serie_slug: string; serie_nome: string; valor_mensalidade: number | null; valor_matricula: number | null; valor_material: number | null; qtd: number };
type Escola = { id: number; nome: string; bairro: string | null; municipio: string; uf: string; latitude: number | null; longitude: number | null; dependencia_administrativa: string; codigo_inep: string; series_precos: SeriePreco[] };
type Props = { escolas: Escola[]; userLocation?: { lat: number; lon: number } | null; hoveredId?: number | null; serieSlug?: string; mapCenter?: { lat: number; lon: number } | null; activeTile?: string; onBoundsChange?: (bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number }) => void; showPrivada?: boolean; showPublica?: boolean };

type MediaEstado = { uf: string; latitude: number; longitude: number; media_mensalidade: number | null; total_escolas: number; publicas: number; privadas: number };
type MediaCidade = { cidade_id: string; nome: string; uf: string; latitude: number; longitude: number; media_mensalidade: number | null; total_escolas: number; publicas: number; privadas: number; distanciaCentro?: number };

const slugToGrupo = new Map<string, string>(SERIES.map((s) => [s.slug, s.grupo]));
const GRUPOS = [...new Set(SERIES.map((s) => s.grupo))];

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

function corFiltro(privada: boolean, publica: boolean): string {
  if (privada && !publica) return "from-[#FF66FF] via-[#C11BE6] to-[#64009A]";
  if (publica && !privada) return "from-[#A3FF2A] via-[#00D632] to-[#007D1C]";
  return "from-[#FF66FF] via-[#C11BE6] to-[#007D1C]";
}

function corFiltroPastel(privada: boolean, publica: boolean): string {
  if (privada && !publica) return "from-[#FF66FF]/40 via-[#C11BE6]/40 to-[#64009A]/40";
  if (publica && !privada) return "from-[#A3FF2A]/40 via-[#00D632]/40 to-[#007D1C]/40";
  return "from-[#FF66FF]/40 via-[#C11BE6]/40 to-[#007D1C]/40";
}

export default function MapaEscolas({ escolas, userLocation, hoveredId, serieSlug, mapCenter, activeTile, onBoundsChange, showPrivada = true, showPublica = true }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<any>(null);
  const aggMarkersRef = useRef<any>(null);
  const lastDataKey = useRef("");
  const lastBoundsKey = useRef("");
  const openPopupId = useRef<number | null>(null);
  const isInitialLoadOrFilterChange = useRef(true);
  const lastMapCenterKey = useRef("");
  const mediasEstado = useRef<MediaEstado[]>([]);
  const mediasCidade = useRef<MediaCidade[]>([]);
  const supabase = useRef(createClient());
  const userMarkerRef = useRef<any>(null);
  const modoVisaoAnteriorRef = useRef<'estado' | 'cidade' | 'escola'>('estado');
  const [mediasCidadeMap, setMediasCidadeMap] = useState<any[]>([]);
  const { theme, resolvedTheme } = useTheme();
  const [temaAtual, setTemaAtual] = useState<string>("");

  function getZoomMode(z: number): "estado" | "cidade" | "escola" {
    if (z < 7) return "estado";
    if (z < 13) return "cidade";
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
      }));
    }
  }

  async function carregarMediasCidade(bounds: any, centroAtual?: any) {
    const { data } = await supabase.current.rpc("obter_medias_cidade").limit(10000);
    if (!data) { mediasCidade.current = []; return; }
    const todas = (data as any[]).map((r) => ({
      cidade_id: r.cidade_id,
      nome: r.nome,
      uf: r.uf,
      latitude: Number(r.latitude ?? r.lat),
      longitude: Number(r.longitude ?? r.lon ?? r.lng),
      media_mensalidade: r.media_mensalidade != null ? Number(r.media_mensalidade) : null,
      total_escolas: r.total_escolas,
      publicas: r.publicas ?? 0,
      privadas: r.privadas ?? 0,
    })).filter((c) => c.latitude && c.longitude);

    const latCentro = centroAtual?.lat ?? state.current.map.getCenter().lat;
    const lonCentro = centroAtual?.lng ?? state.current.map.getCenter().lng;

    const cidadesComDistancia = todas.map((c) => {
      const dLat = c.latitude - latCentro;
      const dLon = c.longitude - lonCentro;
      return { ...c, distanciaCentro: dLat * dLat + dLon * dLon };
    });

    const dentroDaCaixa = cidadesComDistancia.filter((c) =>
      c.latitude >= bounds.minLat && c.latitude <= bounds.maxLat &&
      c.longitude >= bounds.minLon && c.longitude <= bounds.maxLon
    );

    if (dentroDaCaixa.length > 0) {
      mediasCidade.current = dentroDaCaixa
        .sort((a, b) => a.distanciaCentro - b.distanciaCentro)
        .slice(0, 2000);
    } else {
      mediasCidade.current = cidadesComDistancia
        .sort((a, b) => a.distanciaCentro - b.distanciaCentro)
        .slice(0, 2000);
    }
  }

  function renderEstadoMarkers(L: any, layerGroup: any, activeMap: any) {
    if (!layerGroup || !activeMap) return;
    layerGroup.clearLayers();
    const posicoes: Array<{ x: number; y: number }> = [];
    for (const e of mediasEstado.current) {
      const preco = fmtMedia(e.media_mensalidade);
      if (!preco) continue;
      const totalAtivo =
        !showPrivada && !showPublica ? 0
        : showPrivada && !showPublica ? e.privadas
        : !showPrivada && showPublica ? e.publicas
        : e.publicas + e.privadas;
      if (totalAtivo <= 0) continue;
      const p: [number, number] = [e.latitude, e.longitude];
      const px = activeMap.latLngToLayerPoint(L.latLng(e.latitude, e.longitude));
      const colide = posicoes.some((p2) => Math.abs(px.x - p2.x) < 90 && Math.abs(px.y - p2.y) < 40);
      if (colide) continue;
      posicoes.push({ x: px.x, y: px.y });
      const diametro = calcDiameter(totalAtivo, 32, 80);
      const gradiente = corFiltro(showPrivada, showPublica);
      const totalTexto = totalAtivo >= 1000 ? `${(totalAtivo / 1000).toFixed(1).replace(".0", "")}k` : String(totalAtivo);
      const icon = L.divIcon({
        className: "",
        iconSize: null,
        html: `<div style="width:${diametro}px;height:${diametro}px;font-family:system-ui,-apple-system,sans-serif" class="rounded-full bg-gradient-to-br ${gradiente} shadow-[inset_0_4px_6px_rgba(255,255,255,0.7),inset_0_-4px_8px_rgba(0,0,0,0.4),0_6px_12px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center text-white text-center transition-all duration-300 ease-out animate-fade-in"><span class="font-black text-sm drop-shadow-md leading-none">${e.uf}</span><span class="text-[10px] font-black drop-shadow-md leading-tight mt-0.5">${totalTexto}</span></div>`,
      });
      const m = L.marker(p, { icon });
      layerGroup.addLayer(m);
    }
  }

  function calcCidadeDiameter(total: number, min: number, max: number): number {
    if (total <= 0) return min;
    const maxEscolas = 2000;
    const scale = Math.sqrt(Math.min(total, maxEscolas) / maxEscolas);
    return Math.round(min + scale * (max - min));
  }

  function renderCidadeMarkers(L: any, layerGroup: any, activeMap: any, dados?: any[]) {
    if (!layerGroup || !activeMap) return;
    layerGroup.clearLayers();
    const lista = dados ?? mediasCidade.current;
    const isTransition = modoVisaoAnteriorRef.current === "estado";
    const estadoCentros = new Map<string, { lat: number; lng: number }>();
    for (const e of mediasEstado.current) {
      estadoCentros.set(e.uf, { lat: e.latitude, lng: e.longitude });
    }
    const posicoes: Array<{ x: number; y: number }> = [];
    lista.forEach((c: any, idx: number) => {
      if (!c.latitude || !c.longitude) return;
      const px = activeMap.latLngToLayerPoint(L.latLng(c.latitude, c.longitude));
      const colide = posicoes.some((p2) => Math.abs(px.x - p2.x) < 80 && Math.abs(px.y - p2.y) < 30);
      if (colide) return;
      posicoes.push({ x: px.x, y: px.y });
      const delay = `${(idx % 12) * 30}ms`;
      const totalAtivo =
        !showPrivada && !showPublica ? 0
        : showPrivada && !showPublica ? (c.privadas ?? 0)
        : !showPrivada && showPublica ? (c.publicas ?? 0)
        : (c.publicas ?? 0) + (c.privadas ?? 0);
      const pReal: [number, number] = [c.latitude, c.longitude];
      const markerClass = isTransition ? "cidade-marker-icon cidade-marker-moving" : "cidade-marker-icon";
      let icon: any;
      const cidadeGrad = corFiltro(showPrivada, showPublica);
      const cidadeGradPastel = corFiltroPastel(showPrivada, showPublica);
      const nomeCurto = c.nome.length > 10 ? c.nome.slice(0, 9) + "\u2026" : c.nome;
      if (totalAtivo > 0) {
        const diametro = calcCidadeDiameter(totalAtivo, 32, 70);
        const countTexto = totalAtivo >= 1000 ? `${(totalAtivo / 1000).toFixed(1).replace(".0", "")}k` : String(totalAtivo);
        icon = L.divIcon({
          className: markerClass,
          iconSize: null,
          html: `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:visible" class="flex flex-col items-center gap-0.5"><div style="width:${diametro}px;height:${diametro}px;border-radius:50%;overflow:hidden;animation-delay:${delay}" class="bg-gradient-to-br ${cidadeGrad} shadow-[inset_0_4px_6px_rgba(255,255,255,0.7),inset_0_-4px_8px_rgba(0,0,0,0.4),0_6px_12px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center text-white text-center animate-mitose-cidade"><span class="font-black text-xs drop-shadow-md leading-tight">${countTexto}</span></div><span class="text-[9px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)] whitespace-nowrap">${nomeCurto}</span></div>`,
        });
      } else {
        icon = L.divIcon({
          className: markerClass,
          iconSize: null,
          html: `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:visible" class="flex flex-col items-center gap-0.5"><div style="width:24px;height:24px;border-radius:50%;overflow:hidden;animation-delay:${delay}" class="bg-gradient-to-br ${cidadeGradPastel} shadow-[inset_0_4px_6px_rgba(255,255,255,0.7),inset_0_-4px_8px_rgba(0,0,0,0.4),0_6px_12px_rgba(0,0,0,0.2)] flex items-center justify-center text-white/80 text-[9px] font-bold animate-mitose-cidade">0</div><span class="text-[8px] font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] whitespace-nowrap">${c.nome.length > 8 ? c.nome.slice(0, 7) + "\u2026" : c.nome}</span></div>`,
        });
      }
      const centro = estadoCentros.get(c.uf);
      const pInicial: [number, number] = isTransition && centro ? [centro.lat, centro.lng] : pReal;
      const m = L.marker(pInicial, { icon });
      m.bindPopup(`<div style="font-family:sans-serif;padding:2px;color:#1e293b"><strong style="font-size:13px">${c.nome} - ${c.uf}</strong><br/><span style="font-size:12px">${totalAtivo > 0 ? `M\u00e9dia: R$ ${Math.round(Number(c.media_mensalidade ?? 0))}` : "Sem escolas cadastradas"}</span><br/><span style="font-size:11px;color:#64748b">Escolas ativas: ${totalAtivo} ${!showPrivada || !showPublica ? `(total: ${c.total_escolas ?? 0})` : ""}</span></div>`);
      m.addTo(layerGroup);
      if (isTransition) {
        const delayMove = (idx % 12) * 20;
        setTimeout(() => { m.setLatLng(pReal); }, delayMove);
      }
    });
    if (!activeMap.hasLayer(layerGroup)) {
      layerGroup.addTo(activeMap);
    }
  }

  function renderEscolaMarkers(L: any, layerGroup: any, ajustarCamera: boolean) {
    const escolasArray = Array.isArray(escolas) ? escolas : [];
    const z = state.current.map.getZoom();
    const limite = z >= 14 ? 9999 : z >= 12 ? 50 : z >= 10 ? 30 : 15;
    let todas = escolasArray.filter((e) => e.latitude && e.longitude);
    const comPreco = todas.filter((e) => e.dependencia_administrativa === "Privada" && mediaPreco(e, serieSlug));
    const semPreco = todas.filter((e) => e.dependencia_administrativa !== "Privada" || !mediaPreco(e, serieSlug));
    const ordenadas = [...comPreco, ...semPreco];
    const selecionadas = ordenadas.slice(0, Math.min(ordenadas.length, limite));

    const bounds = L.latLngBounds([]);

    for (const e of selecionadas) {
      const p: [number, number] = [e.latitude!, e.longitude!];
      bounds.extend(p);
      const priv = e.dependencia_administrativa === "Privada";
      const color = priv ? "#a855f7" : "#34d399";
      const preco = priv ? mediaPreco(e, serieSlug) : "";
      const h = hoveredId === e.id;
      const m = L.circleMarker(p, { radius: h ? 10 : 7, fillColor: color, color: "#222", weight: h ? 2.5 : 1.5, fillOpacity: h ? 1 : 0.85 });
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
      if (selecionadas.length === 1 && !userLocation) state.current.map.setView([selecionadas[0].latitude!, selecionadas[0].longitude!], 14);
      else state.current.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
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
      modoVisaoAnteriorRef.current = "estado";
    } else if (modo === "cidade") {
      renderCidadeMarkers(L, aggMarkersRef.current, map);
    } else {
      renderEscolaMarkers(L, markers, false);
      modoVisaoAnteriorRef.current = "escola";
    }

    renderUserLocation(L, map);
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
        const boundsInit = map.getBounds();
        await carregarMediasCidade({ minLat: boundsInit.getSouth(), minLon: boundsInit.getWest(), maxLat: boundsInit.getNorth(), maxLon: boundsInit.getEast() });
        setMediasCidadeMap([...mediasCidade.current]);
        renderizar();

        // Telemetry handler — só reage a MUDANÇA DE MODO, não a pan/zoom dentro do mesmo modo
        const handleMapMoveTelemetria = (e: any) => {
          const activeMap = e.target;
          const currentZoom = activeMap.getZoom();
          const limites = activeMap.getBounds();
          const bounds = { minLat: limites.getSouth(), minLon: limites.getWest(), maxLat: limites.getNorth(), maxLon: limites.getEast() };

          if (openPopupId.current !== null) return;

          const modoAtual = currentZoom >= 7 && currentZoom < 13 ? "cidade"
            : currentZoom < 7 ? "estado" : "escola";

          // Só faz algo se o MODO mudou (ex: estado→cidade, cidade→escola)
          if (modoAtual === modoVisaoAnteriorRef.current) return;

          if (aggMarkersRef.current) aggMarkersRef.current.clearLayers();
          if (state.current?.markers) state.current.markers.clearLayers();

          if (modoAtual === "estado") {
            renderEstadoMarkers(L, aggMarkersRef.current, activeMap);
          } else if (modoAtual === "cidade") {
            // Usa dados já carregados no init — sem refetch
            renderCidadeMarkers(L, aggMarkersRef.current, activeMap);
          } else {
            renderEscolaMarkers(L, state.current.markers, false);
            const key = `${bounds.minLat.toFixed(3)}-${bounds.minLon.toFixed(3)}-${bounds.maxLat.toFixed(3)}-${bounds.maxLon.toFixed(3)}`;
            if (key !== lastBoundsKey.current) {
              lastBoundsKey.current = key;
              onBoundsChange?.(bounds);
            }
          }
          modoVisaoAnteriorRef.current = modoAtual;
        };

        map.off("zoomend moveend", handleMapMoveTelemetria);
        map.on("zoomend moveend", handleMapMoveTelemetria);

        // Fechar popup apenas em clique real (sem arrasto)
        let dragging = false;
        map.on("dragstart", () => { dragging = true; });
        map.on("dragend", () => { setTimeout(() => { dragging = false; }, 500); });
        map.on("click", () => { if (!dragging) map.closePopup(); });

        // Mapa inicia no zoom natural do usuário — sem automação
      } catch (e) {
        console.error("MapaEscolas init error:", e);
      }
    })();
  }, []);

  // Render city markers when state is updated by the telemetry handler
  useEffect(() => {
    if (mediasCidadeMap.length > 0 && state.current && aggMarkersRef.current) {
      if (state.current.markers) state.current.markers.clearLayers();
      const { L } = state.current;
      renderCidadeMarkers(L, aggMarkersRef.current, state.current.map, mediasCidadeMap);
      modoVisaoAnteriorRef.current = "cidade";
    }
  }, [mediasCidadeMap]);

  // Re-render aggregated markers when theme changes (Leaflet outside React cycle)
  useEffect(() => {
    if (!state.current || !aggMarkersRef.current) return;
    const t = resolvedTheme ?? theme;
    if (t === temaAtual) return;
    setTemaAtual(t ?? "");
    const zoom = state.current.map.getZoom();
    const modo = getZoomMode(zoom);
      if (modo === "estado" || modo === "cidade") {
        if (aggMarkersRef.current) aggMarkersRef.current.clearLayers();
        if (modo === "estado") {
          renderEstadoMarkers(state.current.L, aggMarkersRef.current, state.current.map);
          modoVisaoAnteriorRef.current = "estado";
        } else if (mediasCidadeMap.length > 0) {
          renderCidadeMarkers(state.current.L, aggMarkersRef.current, state.current.map, mediasCidadeMap);
          modoVisaoAnteriorRef.current = "cidade";
        }
      }
  }, [resolvedTheme, theme, mediasCidadeMap]);

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
    } else if (modo === "estado") {
      if (aggMarkersRef.current) aggMarkersRef.current.clearLayers();
      renderEstadoMarkers(s.L, aggMarkersRef.current, s.map);
      renderUserLocation(s.L, s.map);
    } else if (modo === "cidade") {
      if (aggMarkersRef.current) aggMarkersRef.current.clearLayers();
      if (mediasCidadeMap.length > 0) {
        renderCidadeMarkers(s.L, aggMarkersRef.current, s.map, mediasCidadeMap);
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
    state.current.map.setView([mapCenter.lat, mapCenter.lon], 14, { animate: true });
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

  return <div ref={el} className="w-full h-full rounded-xl z-0" />;
}
