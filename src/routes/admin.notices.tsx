import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const noticesQuery = {
  queryKey: ["admin", "notices"],
  queryFn: async () => {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("starts_at", { ascending: false });
    return data ?? [];
  },
};

export const Route = createFileRoute("/admin/notices")({
  loader: ({ context }) => context.queryClient.ensureQueryData(noticesQuery),
  component: NoticesAdmin,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function NoticesAdmin() {
  const { data } = useSuspenseQuery(noticesQuery);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("notices")
      .insert({ title, body, category, published: true });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Notice published");
    setTitle("");
    setBody("");
    setCategory("general");
    qc.invalidateQueries({ queryKey: ["admin", "notices"] });
    qc.invalidateQueries({ queryKey: ["notices", "all"] });
    qc.invalidateQueries({ queryKey: ["home", "categories"] });
  }

  async function del(id: string) {
    if (!confirm("Delete this notice?")) return;
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Notice deleted");
    qc.invalidateQueries({ queryKey: ["admin", "notices"] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground">Notices</h1>
        <p className="text-sm text-muted-foreground">
          Publish alerts, service interruptions, and community notices.
        </p>
      </header>

      <form
        onSubmit={create}
        className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-card"
      >
        <h2 className="text-sm font-semibold text-foreground">New notice</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notice title"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Notice body — details, dates, affected areas"
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {[
              "general",
              "water",
              "electricity",
              "sewer",
              "refuse",
              "roads",
              "meeting",
              "emergency",
            ].map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Publish notice
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {data.map((n) => (
          <article
            key={n.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                {n.category}
              </div>
              <h3 className="text-base font-semibold text-foreground">{n.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                Posted {formatDate(n.starts_at)}
              </div>
            </div>
            <button
              onClick={() => del(n.id)}
              className="rounded-md p-2 text-destructive hover:bg-destructive/10"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
