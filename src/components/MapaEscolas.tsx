"use client";

import { useEffect, useRef } from "react";
import { SERIES } from "@/lib/series";
import { makeEscolaSlug } from "@/lib/utils";

type SeriePreco = { serie_slug: string; serie_nome: string; valor_mensalidade: number | null; valor_matricula: number | null; valor_material: number | null; qtd: number };
type Escola = { id: number; nome: string; bairro: string | null; municipio: string; uf: string; latitude: number | null; longitude: number | null; dependencia_administrativa: string; codigo_inep: string; series_precos: SeriePreco[] };
type Props = { escolas: Escola[]; userLocation?: { lat: number; lon: number } | null; hoveredId?: number | null; serieSlug?: string; mapCenter?: { lat: number; lon: number } | null; activeTile?: string; onBoundsChange?: (bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number }) => void };

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

export default function MapaEscolas({ escolas, userLocation, hoveredId, serieSlug, mapCenter, activeTile, onBoundsChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<any>(null);
  const lastDataKey = useRef("");
  const lastBoundsKey = useRef("");
  const openPopupId = useRef<number | null>(null);
  const isInitialLoadOrFilterChange = useRef(true);
  const lastMapCenterKey = useRef("");

  function buildKey() {
    const locKey = userLocation ? `${userLocation.lat.toFixed(4)}${userLocation.lon.toFixed(4)}` : "0";
    return `${escolas.length}-${locKey}`;
  }

  function syncMarkers(ajustarCamera: boolean) {
    const s = state.current;
    if (!s) return;
    const { map, L, markers, userMarker } = s;
    markers.clearLayers();

    const escolasArray = Array.isArray(escolas) ? escolas : [];
    const z = map.getZoom();
    const limite = z >= 14 ? 9999 : z >= 12 ? 50 : z >= 10 ? 30 : 15;
    let todas = escolasArray.filter((e) => e.latitude && e.longitude);
    const comPreco = todas.filter((e) => e.dependencia_administrativa === "Privada" && mediaPreco(e, serieSlug));
    const semPreco = todas.filter((e) => e.dependencia_administrativa !== "Privada" || !mediaPreco(e, serieSlug));
    const ordenadas = [...comPreco, ...semPreco];
    const selecionadas = ordenadas.slice(0, Math.min(ordenadas.length, limite));
    if (!selecionadas.length && !userLocation) return;

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
      markers.addLayer(m);
    }

    if (userLocation) {
      const p: [number, number] = [userLocation.lat, userLocation.lon];
      bounds.extend(p);
      if (userMarker.current) {
        if (userMarker.current._int) clearInterval(userMarker.current._int);
        if (userMarker.current._pulse) map.removeLayer(userMarker.current._pulse);
        map.removeLayer(userMarker.current);
      }
      const um = L.circleMarker(p, { radius: 12, fillColor: "#4285f4", color: "#fff", weight: 3, fillOpacity: 0.9 });
      um.bindTooltip("Você");
      um.addTo(map);
      const pulse = L.circleMarker(p, { radius: 18, fillColor: "#4285f4", color: "transparent", fillOpacity: 0.2 });
      pulse.addTo(map);
      let r = 14;
      const int = setInterval(() => { r += 0.5; pulse.setRadius(r); pulse.setStyle({ fillOpacity: Math.max(0, 0.25 - (r - 14) * 0.02) }); if (r > 30) r = 14; }, 40);
      userMarker.current = um;
      userMarker.current._pulse = pulse;
      userMarker.current._int = int;
    } else if (userMarker.current) {
      if (userMarker.current._int) clearInterval(userMarker.current._int);
      if (userMarker.current._pulse) map.removeLayer(userMarker.current._pulse);
      map.removeLayer(userMarker.current);
      userMarker.current = null;
    }

    if (ajustarCamera && isInitialLoadOrFilterChange.current && bounds.isValid()) {
      if (selecionadas.length === 1 && !userLocation) map.setView([selecionadas[0].latitude!, selecionadas[0].longitude!], 14);
      else map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      isInitialLoadOrFilterChange.current = false;
    }
  }

  useEffect(() => {
    if (!el.current || state.current) return;
    (async () => {
      try {
        const mod = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        const L = mod.default || mod;
        const map = L.map(el.current!, { zoomControl: false }).setView([-15.8, -47.9], 4);

        const tiles: Record<string, any> = {
          "Padr\u00e3o": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }),
          "Sat\u00e9lite": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "&copy; Esri", maxZoom: 19 }),
          "Terreno": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenTopoMap", maxZoom: 17 }),
          "Claro": L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "&copy; CARTO", maxZoom: 19 }),
          "Escuro": L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "&copy; CARTO", maxZoom: 19 }),
        };

        tiles["Padr\u00e3o"].addTo(map);

        state.current = { map, L, markers: L.layerGroup().addTo(map), userMarker: { current: null } };
        lastDataKey.current = buildKey();

        if (onBoundsChange) {
          lastBoundsKey.current = "init";
          map.on("click", (e: any) => { if (!e.layer) map.closePopup(); });
          map.on("moveend", () => {
            if (openPopupId.current !== null) return;
            isInitialLoadOrFilterChange.current = false;
            const b = map.getBounds();
            const key = `${b.getSouth().toFixed(3)}-${b.getWest().toFixed(3)}-${b.getNorth().toFixed(3)}-${b.getEast().toFixed(3)}`;
            if (key === lastBoundsKey.current) return;
            lastBoundsKey.current = key;
            if (onBoundsChange) {
              onBoundsChange({
                minLat: b.getSouth(), minLon: b.getWest(),
                maxLat: b.getNorth(), maxLon: b.getEast(),
              });
            }
          });
        }

        try { syncMarkers(true); } catch {}
      } catch (e) {
        console.error("MapaEscolas init error:", e);
      }
    })();
  }, []);

  useEffect(() => {
    const s = state.current;
    if (!s) return;
    const newKey = buildKey();
    syncMarkers(false);
    if (openPopupId.current !== null) {
      s.markers.eachLayer((layer: any) => {
        if (layer._eid === openPopupId.current && layer.getPopup) {
          const p = layer.getPopup();
          if (p && !p.isOpen()) layer.openPopup();
        }
      });
    }
    lastDataKey.current = newKey;
  }, [escolas, userLocation, hoveredId, serieSlug]);

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
    // Remove all existing tile layers
    map.eachLayer((layer: any) => {
      if (layer._url && layer._leaflet_id) {
        map.removeLayer(layer);
      }
    });
    // Add the selected tile
    const tileMap: Record<string, string> = {
      "Padr\u00e3o": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "Sat\u00e9lite": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      "Terreno": "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      "Claro": "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      "Escuro": "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    };
    const url = tileMap[activeTile];
    if (url) {
      L.tileLayer(url, {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
    }
  }, [activeTile]);

  return <div ref={el} className="w-full h-full rounded-xl z-0" />;
}
