import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

const appNoticesQuery = {
  queryKey: ["app", "notices"],
  queryFn: async () => {
    const { data } = await supabase
      .from("notices")
      .select("id, title, body, category, starts_at")
      .eq("published", true)
      .order("starts_at", { ascending: false });
    return data ?? [];
  },
};

export const Route = createFileRoute("/app/notices")({
  loader: ({ context }) => context.queryClient.ensureQueryData(appNoticesQuery),
  component: AppNotices,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">Not found</div>,
});

function AppNotices() {
  const { data } = useSuspenseQuery(appNoticesQuery);
  return (
    <div className="space-y-3 p-4">
      <header>
        <h1 className="font-display text-xl font-bold text-foreground">Municipal notices</h1>
        <p className="text-xs text-muted-foreground">Planned interruptions, meetings and community alerts.</p>
      </header>
      {data.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No notices at this time.</p>}
      {data.map((n) => (
        <article key={n.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="mb-1.5 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {n.category}
          </div>
          <h2 className="text-sm font-semibold text-foreground">{n.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
          <div className="mt-2 text-[10px] text-muted-foreground">{formatDate(n.starts_at)}</div>
        </article>
      ))}
    </div>
  );
}
