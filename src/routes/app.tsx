import { createFileRoute, Link, Outlet, useLocation, redirect } from "@tanstack/react-router";
import { Home, PlusCircle, ClipboardList, Megaphone, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSignOut } from "@/lib/auth";
import crest from "@/assets/logo";
import { Watermark } from "@/components/Watermark";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const roles = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (roles.error) throw roles.error;
    if (roles.data.length) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Ngwathe Connect — Community App" },
      {
        name: "description",
        content:
          "The official Ngwathe Local Municipality community app. Report water, electricity, sewer and road faults from your phone and follow the job card until it is fixed.",
      },
      { property: "og:title", content: "Ngwathe Connect — Community App" },
      {
        property: "og:description",
        content: "Report a fault and track the job card until it is fixed.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CommunityAppLayout,
});

const tabs = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/report", label: "Report", icon: PlusCircle },
  { to: "/app/reports", label: "My reports", icon: ClipboardList },
  { to: "/app/notices", label: "Notices", icon: Megaphone },
];

function CommunityAppLayout() {
  const loc = useLocation();
  const signOut = useSignOut();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-border bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 gradient-brand px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2.5">
          <img
            src={crest}
            alt=""
            width={34}
            height={34}
            className="rounded-md bg-white object-contain p-0.5"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Ngwathe Connect</div>
            <div className="text-[11px] text-primary-foreground/70">Community service app</div>
          </div>
        </div>
        <button
          onClick={signOut}
          title="Sign out"
          className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-primary-foreground/90 hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <main className="relative flex-1 pb-20">
        <Watermark />
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {tabs.map((t) => {
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <t.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition`} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
