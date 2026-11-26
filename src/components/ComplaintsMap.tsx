import { MapContainer as RLMapContainer, TileLayer as RLTileLayer, CircleMarker as RLCircleMarker, Popup } from "react-leaflet";
// react-leaflet v4 types don't include all runtime props; cast for ergonomic usage.
const MapContainer = RLMapContainer as unknown as React.ComponentType<Record<string, unknown>>;
const TileLayer = RLTileLayer as unknown as React.ComponentType<Record<string, unknown>>;
const CircleMarker = RLCircleMarker as unknown as React.ComponentType<Record<string, unknown> & { children?: React.ReactNode }>;
import type React from "react";
import "leaflet/dist/leaflet.css";
import { Link } from "@tanstack/react-router";

interface Point {
  id: string;
  reference: string;
  description: string;
  priority: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  categories: { name: string; color: string; slug: string } | null;
}

export function ComplaintsMap({ points }: { points: Point[] }) {
  const center: [number, number] = [-27.05, 27.6]; // Ngwathe approx centre

  return (
    <MapContainer center={center} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.filter((p) => p.latitude !== null && p.longitude !== null && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180).map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.latitude ?? 0, p.longitude ?? 0]}
          radius={p.priority === "critical" ? 11 : p.priority === "high" ? 9 : 7}
          pathOptions={{
            color: p.categories?.color ?? "#666",
            fillColor: p.categories?.color ?? "#666",
            fillOpacity: 0.7,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1">
              <div className="font-mono text-xs">{p.reference}</div>
              <div className="text-sm font-semibold">{p.categories?.name}</div>
              <div className="text-xs">{p.description}</div>
              <div className="text-xs uppercase">
                <b>{p.priority}</b> · {p.status.replace("_", " ")}
              </div>
              <Link to="/admin/complaints/$id" params={{ id: p.id }} className="text-xs text-blue-600 underline">
                Open complaint →
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
