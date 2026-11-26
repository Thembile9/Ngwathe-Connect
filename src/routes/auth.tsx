import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/lib/auth";
import crest from "@/assets/logo";
import { LogIn, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Ngwathe Connect" },
      {
        name: "description",
        content:
          "Secure sign in for Ngwathe Local Municipality switchboard, supervisors and field personnel.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Sign in — Ngwathe Connect" },
      {
        property: "og:description",
        content: "Secure sign in for municipal switchboard and field staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, staff, loading } = useStaff();
  const [account, setAccount] = useState<"resident" | "staff">("resident");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!busy && !loading && session && staff && staff.hasAccess === (account === "staff"))
      navigate({ to: staff.hasAccess ? "/admin" : "/app", replace: true });
  }, [busy, loading, session, staff, account, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (account !== "resident")
          throw new Error("Staff accounts require administrator approval.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        try {
          const { data: roles, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id);

          if (roleError) throw roleError;

          const hasStaffAccess = (roles ?? []).length > 0;

          if (account === "staff" && !hasStaffAccess) {
            throw new Error("This account is not authorized for municipal staff access.");
          }

          if (account === "resident" && hasStaffAccess) {
            throw new Error("Please use the Municipality worker sign-in option.");
          }

          navigate({
            to: hasStaffAccess ? "/admin" : "/app",
            replace: true,
          });
        } catch (validationError) {
          const { error: logoutError } = await supabase.auth.signOut({
            scope: "local",
          });

          if (logoutError) {
            throw new Error("Unable to terminate the session. Please sign out before continuing.");
          }

          throw validationError;
        }
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
          <img
            src={crest}
            alt="Ngwathe Local Municipality"
            width={44}
            height={44}
            className="rounded-md object-contain"
          />
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Ngwathe Connect</h1>
            <p className="text-xs text-muted-foreground">Secure community and staff access</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {(["resident", "staff"] as const).map((type) => (
            <button
              key={type}
              type="button"
              disabled={busy}
              onClick={() => {
                setAccount(type);
                setMode("signin");
                setSent(false);
                setEmail("");
                setPassword("");
                setFullName("");
              }}
              className={`rounded-xl border p-3 text-sm font-semibold ${account === type ? "border-primary bg-primary/10" : "border-border"}`}
            >
              {type === "resident" ? "Community member" : "Municipality worker"}
            </button>
          ))}
        </div>
        {sent ? (
          <div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-foreground">
            Check your email to confirm the account, then come back and sign in.
          </div>
        ) : (
          <form key={`${account}-${mode}`} onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <>
                <Field label="Full name">
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Enter your full name"
                  />
                </Field>
              </>
            )}
            <Field label="Email address">
              <input
                required
                autoComplete="username"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <input
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={8}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="At least 8 characters"
              />
            </Field>
            <button
              disabled={busy}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {mode === "signin" ? "Sign in" : "Create community account"}
            </button>
          </form>
        )}

        {account === "resident" && (
          <button
            disabled={busy}
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setSent(false);
              setPassword("");
            }}
            className="mt-4 w-full text-center text-xs font-medium text-primary hover:underline"
          >
            {mode === "signin"
              ? "No account yet? Register a community account"
              : "Already registered? Sign in"}
          </button>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-secondary p-3 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Community registration does not grant staff access. Municipal roles are assigned by an
          administrator.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
