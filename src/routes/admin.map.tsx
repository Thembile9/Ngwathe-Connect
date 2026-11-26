import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/lib/auth";

const Map = lazy(() => import("@/components/ComplaintsMap").then((m) => ({ default: m.ComplaintsMap })));
export const Route = createFileRoute("/admin/map")({ component: MapPage });
function MapPage() {
  const { staff, loading } = useStaff();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const allowed = !!staff?.isControlRoom;
  const query = useQuery({
    queryKey: ["admin", "map", staff?.userId],
    enabled: mounted && allowed,
    queryFn: async () => {
      const { data, error } = await supabase.from("complaints")
        .select("id, reference, description, priority, status, latitude, longitude, categories(name, color, slug)")
        .not("latitude", "is", null).not("longitude", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });
  if (loading || !mounted) return <p>Loading map…</p>;
  if (!allowed) return <p>Access denied.</p>;
  if (query.isError) return <p>Unable to load complaint locations: {query.error.message}</p>;
  if (query.isPending) return <p>Loading complaint locations…</p>;
  return <section className="space-y-4"><h1 className="text-2xl font-bold">GIS Map</h1>
    <p>{query.data.length} geolocated complaints</p>
    <div className="h-[65vh] overflow-hidden rounded-lg border"><Suspense fallback={<p>Loading map…</p>}><Map points={query.data} /></Suspense></div>
  </section>;
}
