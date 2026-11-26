export function formatDate(input: string | Date | null | undefined) {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  // Fixed zone so SSR and client render identical text (no hydration mismatch).
  return d.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  });
}

export function timeAgo(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" });
}

export const priorityStyles: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-warning text-warning-foreground",
  medium: "bg-info text-info-foreground",
  low: "bg-muted text-muted-foreground",
};

export const statusStyles: Record<string, string> = {
  new: "bg-info/15 text-info border-info/30",
  acknowledged: "bg-accent text-accent-foreground",
  assigned: "bg-primary/10 text-primary border-primary/20",
  in_progress: "bg-warning/20 text-warning-foreground border-warning/40",
  on_hold: "bg-muted text-muted-foreground",
  resolved: "bg-success/20 text-success border-success/40",
  closed: "bg-muted text-muted-foreground",
};

export function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
