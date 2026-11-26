import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Droplet,
  Zap,
  Waves,
  Trash2,
  Construction,
  CloudRain,
  Lamp,
  OctagonAlert,
  Trees,
  Flame,
  Receipt,
  CircleHelp,
  ArrowRight,
  Phone,
  Download,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyReports } from "@/lib/demo-session";
import { InstallAppCard } from "@/components/InstallAppCard";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  droplet: Droplet,
  zap: Zap,
  waves: Waves,
  "trash-2": Trash2,
  construction: Construction,
  "cloud-rain": CloudRain,
  lamp: Lamp,
  "octagon-alert": OctagonAlert,
  trees: Trees,
  flame: Flame,
  receipt: Receipt,
  "circle-help": CircleHelp,
};

const appHomeQuery = {
  queryKey: ["app", "home"],
  queryFn: async () => {
    const [cats, notices] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order").limit(8),
      supabase
        .from("notices")
        .select("id, title, body, category, starts_at")
        .eq("published", true)
        .order("starts_at", { ascending: false })
        .limit(3),
    ]);
    return { categories: cats.data ?? [], notices: notices.data ?? [] };
  },
};

export const Route = createFileRoute("/app/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(appHomeQuery),
  component: AppHome,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">Not found</div>,
});

function AppHome() {
  const { data } = useSuspenseQuery(appHomeQuery);
  const myRefs = useMyReports();

  return (
    <div className="space-y-5 p-4">
      <section className="rounded-2xl gradient-brand p-5 text-primary-foreground shadow-brand">
        <h1 className="font-display text-2xl font-bold leading-snug">
          Something broken in your street?
        </h1>
        <p className="mt-1.5 text-sm text-primary-foreground/85">
          Report it in under a minute. We create a job card and send it straight to the right team.
        </p>
        <Link
          to="/app/report"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-gold-foreground"
        >
          Report a fault <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {myRefs.length > 0 && (
        <Link
          to="/app/reports"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <div>
            <div className="text-sm font-semibold text-foreground">
              You have {myRefs.length} report{myRefs.length === 1 ? "" : "s"}
            </div>
            <div className="text-xs text-muted-foreground">Tap to see progress and job cards</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      <section>
        <h2 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          What is the problem?
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {data.categories.map((c) => {
            const Icon = iconMap[c.icon] ?? CircleHelp;
            return (
              <Link
                key={c.id}
                to="/app/report"
                search={{ category: c.slug }}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-card active:scale-[0.98]"
              >
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white"
                  style={{ backgroundColor: c.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-foreground">{c.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{c.department}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <ShieldAlert className="h-4 w-4" /> Emergency?
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          For fires, live electrical cables or sewage flooding a home, call the 24-hour control room
          immediately.
        </p>
        <a
          href="tel:+27568162700"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground"
        >
          <Phone className="h-3.5 w-3.5" /> 056 816 2700
        </a>
      </section>

      {data.notices.length > 0 && (
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Notices
            </h2>
            <Link to="/app/notices" className="text-xs font-medium text-primary">
              View all
            </Link>
          </div>
          <div className="space-y-2.5">
            {data.notices.map((n) => (
              <article
                key={n.id}
                className="rounded-xl border border-border bg-card p-3.5 shadow-card"
              >
                <div className="mb-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {n.category}
                </div>
                <h3 className="text-sm font-semibold text-foreground">{n.title}</h3>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <InstallAppCard />

      <p className="pb-2 text-center text-[10px] text-muted-foreground">
        <Download className="mr-1 inline h-3 w-3" />
        Ngwathe Connect · Official municipal community app
      </p>
    </div>
  );
}
