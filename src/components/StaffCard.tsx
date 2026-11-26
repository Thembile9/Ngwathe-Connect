import { Link } from "@tanstack/react-router";
import { useStaff, useSignOut, roleLabel, type AppRole } from "@/lib/auth";
import { LogOut, ShieldCheck } from "lucide-react";

export function StaffCard() {
  const { staff } = useStaff();
  const signOut = useSignOut();
  if (!staff) return null;

  return (
    <div className="rounded-md bg-sidebar-accent/60 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/70">
        <ShieldCheck className="h-3 w-3" /> Signed in
      </div>
      <div className="truncate text-sm font-medium text-sidebar-foreground">{staff.fullName}</div>
      <div className="truncate text-[11px] text-sidebar-foreground/70">
        {staff.roles.length ? staff.roles.map((r) => roleLabel[r as AppRole]).join(" · ") : "No role assigned"}
        {staff.department ? ` · ${staff.department}` : ""}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {staff.isAdmin && (
          <Link to="/admin/access" className="text-[11px] font-medium text-sidebar-foreground/80 hover:underline">
            Manage access
          </Link>
        )}
        <button onClick={signOut} className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-sidebar-foreground/80 hover:underline">
          <LogOut className="h-3 w-3" /> Sign out
        </button>
      </div>
    </div>
  );
}
