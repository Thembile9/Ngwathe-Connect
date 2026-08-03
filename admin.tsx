import { createFileRoute, Link, Outlet, useLocation, redirect } from "@tanstack/react-router";
import {
  LayoutDashboard, ListChecks, Map, BarChart3, Megaphone, ArrowUpRight,
  Headset, HardHat, Users, ScrollText, ShieldAlert, KeyRound,
} from "lucide-react";
import crest from "@/assets/logo";
import { StaffCard } from "@/components/StaffCard";
import { Watermark } from "@/components/Watermark";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  // Session lives in browser storage, so the gate must run client-side only.
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({
    meta: [
      { title: "Municipal Switchboard — Ngwathe Connect" },
      { name: "description", content: "Switchboard, job card dispatch and audit console for Ngwathe Local Municipality." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Municipal Switchboard — Ngwathe Connect" },
      { property: "og:description", content: "Switchboard, job card dispatch and audit console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  /** which capability the item needs */
  need: "any" | "control" | "admin";
};

const nav: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, need: "any" },
  { to: "/admin/switchboard", label: "Switchboard", icon: Headset, need: "control" },
  { to: "/admin/jobs", label: "Job cards", icon: HardHat, need: "any" },
  { to: "/admin/complaints", label: "Complaints", icon: ListChecks, need: "any" },
  { to: "/admin/personnel", label: "Personnel", icon: Users, need: "control" },
  { to: "/admin/map", label: "GIS Map", icon: Map, need: "control" },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, need: "control" },
  { to: "/admin/audit", label: "Audit logs", icon: ScrollText, need: "control" },
  { to: "/admin/notices", label: "Notices", icon: Megaphone, need: "control" },
  { to: "/admin/access", label: "Access control", icon: KeyRound, need: "admin" },
];

function AdminLayout() {
  const loc = useLocation();
  const { staff, loading } = useStaff();

  const visible = nav.filter((n) => {
    if (!staff) return false;
    if (n.need === "admin") return staff.isAdmin;
    if (n.need === "control") return staff.isControlRoom;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
          <img src={crest} alt="" width={36} height={36} className="rounded-md bg-white object-contain p-0.5" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Ngwathe Admin</div>
            <div className="text-xs text-sidebar-foreground/60">Service Delivery</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {visible.map((n) => {
            const active = n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/85 hover:bg-sidebar-accent"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border p-3">
          <StaffCard />
          <Link to="/app" className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent">
            Open community app <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link to="/" className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent">
            View public site <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      <main className="relative flex-1 overflow-x-auto">
        <Watermark />
        <div className="flex items-center justify-between border-b border-border bg-sidebar p-3 text-sidebar-foreground md:hidden">
          <div className="flex items-center gap-2">
            <img src={crest} alt="" width={28} height={28} className="rounded-md bg-white object-contain p-0.5" />
            <div className="text-sm font-semibold">Ngwathe Admin</div>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {visible.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-md p-2 text-sidebar-foreground/80 hover:bg-sidebar-accent" title={n.label}>
                <n.icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-sm text-muted-foreground">Checking your permissions…</div>
        ) : staff && !staff.hasAccess ? (
          <NoAccess email={staff.email} />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

function NoAccess({ email }: { email: string | null }) {
  return (
    <div className="mx-auto max-w-lg p-10 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-warning-foreground" />
      <h1 className="mt-3 font-display text-xl font-bold text-foreground">Awaiting role assignment</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your account{email ? ` (${email})` : ""} is registered but has no municipal role yet. An administrator must grant you
        switchboard, supervisor or technician access before any complaint or job card data becomes visible.
      </p>
    </div>
  );
}
