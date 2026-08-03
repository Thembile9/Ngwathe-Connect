import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

const noticesQuery = {
  queryKey: ["notices", "all"],
  queryFn: async () => {
    const { data } = await supabase.from("notices").select("*").eq("published", true).order("starts_at", { ascending: false });
    return data ?? [];
  },
};

export const Route = createFileRoute("/notices")({
  head: () => ({
    meta: [
      { title: "Municipal Notices — Ngwathe" },
      { name: "description", content: "Latest municipal notices, water interruptions, meetings and community alerts from Ngwathe Local Municipality." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(noticesQuery),
  component: NoticesPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function NoticesPage() {
  const { data } = useSuspenseQuery(noticesQuery);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-foreground">Municipal Notices</h1>
        <p className="mt-2 text-muted-foreground">Official notices, service interruptions, meetings and community alerts.</p>
        <div className="mt-8 space-y-4">
          {data.length === 0 && <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">No notices at this time.</div>}
          {data.map((n) => (
            <article key={n.id} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="mb-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-primary">
                {n.category}
              </div>
              <h2 className="text-lg font-semibold text-foreground">{n.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              <div className="mt-3 text-xs text-muted-foreground">Posted {formatDate(n.starts_at)}</div>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-primary hover:underline">← Back to home</Link>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
