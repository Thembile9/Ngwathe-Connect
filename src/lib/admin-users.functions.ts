import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleEnum = z.enum(["admin", "switchboard", "supervisor", "technician"]);

async function assertAdmin(context: { supabase: { rpc: (fn: never, args: never) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await (context.supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null }>;
  }).rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: administrator role required");
}

export const listStaffAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: roles }, { data: people }] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id, full_name, email, department, created_at").order("created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("personnel").select("id, full_name, department, user_id"),
    ]);

    return (profiles ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.user_id).map((r) => r.role as string),
      personnel: (people ?? []).find((x) => x.user_id === p.user_id) ?? null,
    }));
  });

export const setUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ user_id: z.string().uuid(), roles: z.array(RoleEnum).max(4) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    if (data.user_id === context.userId && !data.roles.includes("admin")) {
      throw new Error("You cannot remove your own administrator role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    if (data.roles.length) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert(data.roles.map((role) => ({ user_id: data.user_id, role })));
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const linkPersonnelAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), personnel_id: z.string().uuid().nullable() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("personnel").update({ user_id: null }).eq("user_id", data.user_id);
    if (data.personnel_id) {
      const { error } = await supabaseAdmin.from("personnel").update({ user_id: data.user_id }).eq("id", data.personnel_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
