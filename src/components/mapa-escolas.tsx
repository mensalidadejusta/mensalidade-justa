"use client";

import { useEffect, useRef } from "react";

type Escola = { id: number; nome: string; latitude: number | null; longitude: number | null; dependencia_administrativa: string };
type Props = { escolas: Escola[]; userLocation?: { lat: number; lon: number } | null; hoveredId?: number | null };

export default function MapaEscolas({ escolas, userLocation, hoveredId }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<any>(null);
  const lastDataKey = useRef("");

  function buildKey() {
    const locKey = userLocation ? `${userLocation.lat.toFixed(4)}${userLocation.lon.toFixed(4)}` : "0";
    return `${escolas.length}-${locKey}`;
  }

  function syncMarkers(updateView: boolean) {
    const s = state.current;
    if (!s) return;
    const { map, L, markers, userMarker } = s;
    markers.clearLayers();

    const vals = escolas.filter((e) => e.latitude && e.longitude);
    if (!vals.length && !userLocation) return;

    const bounds = L.latLngBounds([]);

    for (const e of vals) {
      const p: [number, number] = [e.latitude!, e.longitude!];
      bounds.extend(p);
      const color = e.dependencia_administrativa === "Privada" ? "#3b82f6" : "#22c55e";
      const h = hoveredId === e.id;
      const m = L.circleMarker(p, { radius: h ? 10 : 7, fillColor: color, color: "#fff", weight: h ? 3 : 2, fillOpacity: h ? 1 : 0.8 });
      m._eid = e.id;
      m.bindTooltip(e.nome, { direction: "top", offset: [0, -8] });
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
      if (vals.length === 1 && !userLocation) map.setView([vals[0].latitude!, vals[0].longitude!], 14);
      else map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }

  function updateHover() {
    const s = state.current;
    if (!s) return;
    s.markers.eachLayer((m: any) => {
      if (m._eid === undefined) return;
      const h = hoveredId === m._eid;
      m.setRadius(h ? 10 : 7);
      m.setStyle({ weight: h ? 3 : 2, fillOpacity: h ? 1 : 0.8 });
    });
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

      state.current = { map, L, markers: L.layerGroup().addTo(map), userMarker: { current: null } };
      lastDataKey.current = buildKey();
      syncMarkers(true);
    })();
  }, []);

  useEffect(() => {
    const s = state.current;
    if (!s) return;
    const newKey = buildKey();
    if (newKey !== lastDataKey.current) {
      lastDataKey.current = newKey;
      syncMarkers(true);
    } else {
      updateHover();
    }
  }, [escolas, userLocation, hoveredId]);

  return <div ref={el} className="w-full h-full rounded-xl z-0" />;
}
