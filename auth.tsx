import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import crest from "@/assets/logo";
import { LogIn, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff sign in — Ngwathe Connect" },
      { name: "description", content: "Secure sign in for Ngwathe Local Municipality switchboard, supervisors and field personnel." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Staff sign in — Ngwathe Connect" },
      { property: "og:description", content: "Secure sign in for municipal switchboard and field staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (ready && session) navigate({ to: "/admin", replace: true });
  }, [ready, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.session) {
          await afterSignIn(fullName, department);
          navigate({ to: "/admin", replace: true });
        } else {
          setSent(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await afterSignIn(fullName, department);
        navigate({ to: "/admin", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-secondary p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <img src={crest} alt="Ngwathe Local Municipality" width={44} height={44} className="rounded-md object-contain" />
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Ngwathe Connect</h1>
            <p className="text-xs text-muted-foreground">Municipal staff sign in</p>
          </div>
        </div>

        {sent ? (
          <div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-foreground">
            Check your email to confirm the account, then come back and sign in.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <>
                <Field label="Full name">
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" placeholder="Thabo Mokoena" />
                </Field>
                <Field label="Department">
                  <input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" placeholder="Water & Sanitation" />
                </Field>
              </>
            )}
            <Field label="Work email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" placeholder="you@ngwathe.gov.za" />
            </Field>
            <Field label="Password">
              <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" placeholder="At least 8 characters" />
            </Field>
            <button disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {mode === "signin" ? "Sign in" : "Create staff account"}
            </button>
          </form>
        )}

        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setSent(false); }}
          className="mt-4 w-full text-center text-xs font-medium text-primary hover:underline"
        >
          {mode === "signin" ? "No account yet? Register a staff account" : "Already registered? Sign in"}
        </button>

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-secondary p-3 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          New accounts have no access until an administrator assigns a role. The first account created becomes the administrator.
        </p>

        <Link to="/app" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back to the community app
        </Link>
      </div>
    </div>
  );
}

/** Creates the profile row on first sign in and claims admin if the system has none. */
async function afterSignIn(fullName: string, department: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;
  await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      full_name: fullName || (user.user_metadata?.full_name as string) || user.email || "",
      email: user.email ?? null,
      department: department || null,
    },
    { onConflict: "user_id" }
  );
  await supabase.rpc("claim_bootstrap_admin");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
