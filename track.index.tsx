import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Search } from "lucide-react";

export const Route = createFileRoute("/track/")({
  head: () => ({
    meta: [
      { title: "Track a Complaint — Ngwathe Municipality" },
      { name: "description", content: "Enter your reference number to check the status of a service delivery complaint." },
    ],
  }),
  component: TrackLookup,
});

function TrackLookup() {
  const [ref, setRef] = useState("");
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h1 className="font-display text-2xl font-bold text-foreground">Track your complaint</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the reference number we sent you (e.g. NGW-2026-001045).
          </p>
          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (ref.trim()) navigate({ to: "/track/$ref", params: { ref: ref.trim().toUpperCase() } });
            }}
          >
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="NGW-2026-XXXXXX"
              className="flex-1 rounded-md border border-input bg-background px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Search className="h-4 w-4" /> Track
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            Don't have a reference?{" "}
            <Link to="/chat" className="font-medium text-primary hover:underline">
              Report a new issue →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
