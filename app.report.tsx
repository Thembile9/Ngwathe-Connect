import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Crosshair, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitComplaint } from "@/lib/complaints.functions";
import { rememberReport } from "@/lib/demo-session";

const formQuery = {
  queryKey: ["app", "report", "form"],
  queryFn: async () => {
    const [cats, wards, towns] = await Promise.all([
      supabase.from("categories").select("id, slug, name, department, color").order("sort_order"),
      supabase.from("wards").select("ward_number, name").order("ward_number"),
      supabase.from("towns").select("name").order("name"),
    ]);
    return { categories: cats.data ?? [], wards: wards.data ?? [], towns: towns.data ?? [] };
  },
};

export const Route = createFileRoute("/app/report")({
  validateSearch: (search: Record<string, unknown>): { category?: string } =>
    typeof search.category === "string" ? { category: search.category } : {},
  loader: ({ context }) => context.queryClient.ensureQueryData(formQuery),
  component: ReportPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">Not found</div>,
});

function ReportPage() {
  const { data } = useSuspenseQuery(formQuery);
  const { category: presetCategory } = Route.useSearch();
  const navigate = useNavigate();
  const submit = useServerFn(submitComplaint);

  const [category, setCategory] = useState(presetCategory ?? "");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [ward, setWard] = useState("");
  const [town, setTown] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ reference: string; priority: string; assigned_department: string | null } | null>(null);

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Location is not available on this device");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Location attached");
      },
      () => {
        setLocating(false);
        toast.error("Could not get your location. Please type the street address.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await submit({
        data: {
          category_slug: category || undefined,
          ward_number: ward ? Number(ward) : undefined,
          town_name: town || undefined,
          resident_name: name.trim(),
          resident_phone: phone.trim(),
          street_address: address.trim() || undefined,
          latitude: coords?.lat,
          longitude: coords?.lng,
          description: description.trim(),
          channel: "web" as const,
        },
      });
      rememberReport(created.reference);
      setResult(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your report");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4 p-4">
        <div className="rounded-2xl border border-success/40 bg-success/10 p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-3 font-display text-xl font-bold text-foreground">Report received</h1>
          <p className="mt-1 text-sm text-muted-foreground">Keep this reference number safe.</p>
          <div className="mt-4 rounded-xl bg-card px-4 py-3 font-mono text-lg font-bold tracking-wide text-primary">
            {result.reference}
          </div>
          <dl className="mt-4 space-y-1 text-left text-xs">
            <div className="flex justify-between"><dt className="text-muted-foreground">Priority</dt><dd className="font-semibold uppercase text-foreground">{result.priority}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Routed to</dt><dd className="font-semibold text-foreground">{result.assigned_department ?? "Customer Care"}</dd></div>
          </dl>
        </div>
        <Link to="/app/reports" className="block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">
          Track my reports
        </Link>
        <button
          onClick={() => { setResult(null); setDescription(""); setCoords(null); navigate({ to: "/app/report", search: {} }); }}
          className="block w-full rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-semibold text-foreground"
        >
          Report another fault
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4">
      <header>
        <h1 className="font-display text-xl font-bold text-foreground">Report a fault</h1>
        <p className="text-xs text-muted-foreground">The switchboard turns this into a job card for the responsible department.</p>
      </header>

      <Field label="What is the problem?">
        <select value={category} onChange={(e) => setCategory(e.target.value)} required className={inputCls}>
          <option value="">Select a service</option>
          {data.categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="Describe what is happening">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={4}
          rows={4}
          placeholder="e.g. Sewage has been running down the street outside my gate since yesterday morning."
          className={inputCls}
        />
      </Field>

      <Field label="Where is it?">
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address or nearest landmark" className={inputCls} />
        <button type="button" onClick={useMyLocation} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground">
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
          {coords ? "Location attached ✓" : "Use my current location"}
        </button>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ward">
          <select value={ward} onChange={(e) => setWard(e.target.value)} className={inputCls}>
            <option value="">Not sure</option>
            {data.wards.map((w) => <option key={w.ward_number} value={w.ward_number}>Ward {w.ward_number}</option>)}
          </select>
        </Field>
        <Field label="Town">
          <select value={town} onChange={(e) => setTown(e.target.value)} className={inputCls}>
            <option value="">Not sure</option>
            {data.towns.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Your name">
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="Full name" />
      </Field>
      <Field label="Contact number">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" className={inputCls} placeholder="072 000 0000" />
      </Field>

      <button disabled={busy} className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? "Sending to the switchboard…" : "Submit report"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
