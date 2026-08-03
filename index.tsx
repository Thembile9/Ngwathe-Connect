import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Droplet, Zap, Waves, Trash2, Construction, CloudRain, Lamp, OctagonAlert, Trees, Flame, Receipt, CircleHelp,
  MessageCircle, ShieldCheck, Clock, MapPin,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/ngwathe-hero.jpg";
import crest from "@/assets/logo";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  droplet: Droplet, zap: Zap, waves: Waves, "trash-2": Trash2, construction: Construction,
  "cloud-rain": CloudRain, lamp: Lamp, "octagon-alert": OctagonAlert, trees: Trees, flame: Flame,
  receipt: Receipt, "circle-help": CircleHelp,
};

const categoriesQuery = {
  queryKey: ["home", "categories"],
  queryFn: async () => {
    const [cats, notices] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("notices").select("*").eq("published", true).order("starts_at", { ascending: false }).limit(4),
    ]);
    return { categories: cats.data ?? [], notices: notices.data ?? [] };
  },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ngwathe Local Municipality — Report Service Delivery Issues" },
      {
        name: "description",
        content:
          "Official Ngwathe Local Municipality service delivery portal. Report water, electricity, sewer, roads and other issues 24/7 via chat, and track your complaint in real time.",
      },
      { property: "og:title", content: "Ngwathe Local Municipality — Service Delivery" },
      { property: "og:description", content: "Report and track municipal service issues 24/7." },
      { property: "og:type", content: "website" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQuery),
  component: Home,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Not found</div>,
});

function Home() {
  const { data } = useSuspenseQuery(categoriesQuery);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={hero}
          alt="Vaal River flowing through Ngwathe at sunset"
          width={1920}
          height={900}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/40" />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-[1.4fr_1fr] md:py-24">
          <div className="text-primary-foreground">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full bg-success" /> 24/7 AI-powered service portal
            </div>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight md:text-6xl">
              Report a service issue in under two minutes.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-primary-foreground/90">
              Water outages, electricity, sewer, potholes, fires. Chat with our municipal assistant, get a reference number instantly, and track progress in real time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/chat"
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-base font-semibold text-gold-foreground shadow-brand transition hover:brightness-105"
              >
                <MessageCircle className="h-5 w-5" /> Report an Issue
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/5 px-6 py-3 text-base font-semibold text-primary-foreground backdrop-blur hover:bg-white/10"
              >
                Track a Complaint
              </Link>
            </div>
          </div>
          <img src={crest} alt="Ngwathe Municipality crest" width={360} height={360} className="mx-auto hidden max-w-[280px] drop-shadow-2xl md:block" />
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-3">
          {[
            { icon: Clock, label: "Instant acknowledgement", sub: "Automated response, real reference number" },
            { icon: ShieldCheck, label: "AI-triaged priority", sub: "Critical cases escalated in seconds" },
            { icon: MapPin, label: "Ward-based routing", sub: "Sent to the right team, first time" },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{f.label}</div>
                <div className="text-xs text-muted-foreground">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">Report a service delivery issue</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">Pick the category that best matches your issue, or open the chat and describe it in your own words.</p>
          </div>
          <Link to="/chat" className="hidden shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground md:inline-block">Open Chat</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.categories.map((c) => {
            const Icon = iconMap[c.icon] ?? CircleHelp;
            return (
              <Link
                key={c.id}
                to="/chat"
                search={{ category: c.slug }}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-lg"
              >
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white"
                  style={{ backgroundColor: c.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary">{c.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{c.department}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Notices */}
      <section className="border-t border-border bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-3xl font-bold text-foreground">Latest municipal notices</h2>
            <Link to="/notices" className="text-sm font-medium text-primary hover:underline">View all →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.notices.length === 0 && (
              <div className="text-sm text-muted-foreground">No notices at this time.</div>
            )}
            {data.notices.map((n) => (
              <article key={n.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="mb-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-primary">
                  {n.category}
                </div>
                <h3 className="text-lg font-semibold text-foreground">{n.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
