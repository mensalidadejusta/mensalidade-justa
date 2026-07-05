"use client";

import { useEffect, useRef } from "react";

type SeriePreco = { serie_slug?: string; valor_mensalidade: number | null };
type Escola = { id: number; nome: string; latitude: number | null; longitude: number | null; dependencia_administrativa: string; series_precos?: SeriePreco[] };
type Props = { escolas: Escola[]; userLocation?: { lat: number; lon: number } | null; hoveredId?: number | null; serieSlug?: string; onBoundsChange?: (bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number }) => void };

function mediaPreco(e: Escola, serieSlug?: string): string {
  const precos = (e.series_precos || [])
    .filter((s) => !serieSlug || s.serie_slug === serieSlug)
    .map((s) => s.valor_mensalidade)
    .filter((v): v is number => v != null);
  if (precos.length === 0) return "";
  const media = precos.reduce((a, b) => a + b, 0) / precos.length;
  return media >= 1000 ? `R$ ${(media / 1000).toFixed(1).replace(".0", "")}k` : `R$ ${Math.round(media)}`;
}

export default function MapaEscolas({ escolas, userLocation, hoveredId, serieSlug, onBoundsChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<any>(null);
  const lastDataKey = useRef("");
  const lastBoundsKey = useRef("");

  function buildKey() {
    const locKey = userLocation ? `${userLocation.lat.toFixed(4)}${userLocation.lon.toFixed(4)}` : "0";
    return `${escolas.length}-${locKey}`;
  }

  function syncMarkers(updateView: boolean) {
    const s = state.current;
    if (!s) return;
    const { map, L, markers, userMarker } = s;
    markers.clearLayers();

    const z = map.getZoom();
    const limite = z >= 14 ? 9999 : z >= 12 ? 50 : z >= 10 ? 30 : 15;
    let todas = escolas.filter((e) => e.latitude && e.longitude);
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
      if (preco) {
        m.bindTooltip(
          `<span style="color:${color};font-weight:700;font-size:11px">${preco}</span>`,
          { permanent: true, direction: "top", offset: [0, -12], className: "" }
        );
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

    if (updateView && bounds.isValid()) {
      const lastPan = s.lastPanAt || 0;
      if (Date.now() - lastPan > 2000) {
        if (selecionadas.length === 1 && !userLocation) map.setView([selecionadas[0].latitude!, selecionadas[0].longitude!], 14);
        else map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }
  }

  useEffect(() => {
    if (!el.current || state.current) return;
    (async () => {
      const mod = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      const L = mod.default || mod;
      const map = L.map(el.current!, { zoomControl: false }).setView([-15.8, -47.9], 4);

      const tiles: Record<string, any> = {
        "Padrão": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }),
        "Satélite": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "&copy; Esri", maxZoom: 19 }),
        "Terreno": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenTopoMap", maxZoom: 17 }),
        "Claro": L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "&copy; CARTO", maxZoom: 19 }),
        "Escuro": L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "&copy; CARTO", maxZoom: 19 }),
      };

      tiles["Padrão"].addTo(map);
      L.control.layers(tiles, {}, { position: "topright", collapsed: true }).addTo(map);

      state.current = { map, L, markers: L.layerGroup().addTo(map), userMarker: { current: null }, lastPanAt: 0 };
      lastDataKey.current = buildKey();

      if (onBoundsChange) {
        lastBoundsKey.current = "init";
        map.on("moveend", () => {
          const b = map.getBounds();
          const key = `${b.getSouth().toFixed(3)}-${b.getWest().toFixed(3)}-${b.getNorth().toFixed(3)}-${b.getEast().toFixed(3)}`;
          if (key === lastBoundsKey.current) return;
          lastBoundsKey.current = key;
          state.current.lastPanAt = Date.now();
          onBoundsChange({
            minLat: b.getSouth(), minLon: b.getWest(),
            maxLat: b.getNorth(), maxLon: b.getEast(),
          });
        });
      }

      syncMarkers(true);
    })();
  }, []);

  useEffect(() => {
    const s = state.current;
    if (!s) return;
    const newKey = buildKey();
    syncMarkers(true);
    lastDataKey.current = newKey;
  }, [escolas, userLocation, hoveredId, serieSlug]);

  return <div ref={el} className="w-full h-full rounded-xl z-0" />;
}
