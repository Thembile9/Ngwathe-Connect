import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Send, Paperclip, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitComplaint } from "@/lib/complaints.functions";
import { AppHeader } from "@/components/AppHeader";
import crest from "@/assets/logo";

const searchSchema = z.object({ category: z.string().optional() });

const chatBootQuery = {
  queryKey: ["chat", "boot"],
  queryFn: async () => {
    const [cats, subs, wards, towns] = await Promise.all([
      supabase.from("categories").select("id, slug, name, department, color, sort_order").order("sort_order"),
      supabase.from("subcategories").select("id, category_id, slug, name, sort_order, default_priority").order("sort_order"),
      supabase.from("wards").select("id, ward_number, name").order("ward_number"),
      supabase.from("towns").select("id, name").order("name"),
    ]);
    return {
      categories: cats.data ?? [],
      subcategories: subs.data ?? [],
      wards: wards.data ?? [],
      towns: towns.data ?? [],
    };
  },
};

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Report an Issue — Ngwathe Municipality" },
      { name: "description", content: "Chat with the Ngwathe Municipality assistant to report service delivery issues." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(chatBootQuery),
  component: ChatPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

type Step =
  | "welcome"
  | "category"
  | "subcategory"
  | "description"
  | "name"
  | "phone"
  | "town"
  | "ward"
  | "address"
  | "submitting"
  | "done";

interface Msg {
  role: "bot" | "user";
  text: string;
  time: string;
}

function nowLabel() {
  return new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

function ChatPage() {
  const { data } = useSuspenseQuery(chatBootQuery);
  const search = Route.useSearch();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "bot",
      text:
        "👋 Welcome to Ngwathe Local Municipality.\nThank you for contacting us. Please choose the category that best describes your issue.",
      time: nowLabel(),
    },
  ]);
  const [step, setStep] = useState<Step>("category");
  const [form, setForm] = useState<{
    category_slug?: string;
    category_name?: string;
    subcategory_slug?: string;
    description?: string;
    resident_name?: string;
    resident_phone?: string;
    town_name?: string;
    ward_number?: number;
    street_address?: string;
  }>({});
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ reference: string; priority: string; ai_summary: string | null } | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, step]);

  // If URL specifies category, jump ahead
  useEffect(() => {
    if (search.category && step === "category") {
      const c = data.categories.find((x) => x.slug === search.category);
      if (c) selectCategory(c.slug, c.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subs = useMemo(
    () =>
      form.category_slug
        ? data.subcategories.filter(
            (s) => s.category_id === data.categories.find((c) => c.slug === form.category_slug)?.id
          )
        : [],
    [form.category_slug, data]
  );

  function pushBot(text: string) {
    setMessages((m) => [...m, { role: "bot", text, time: nowLabel() }]);
  }
  function pushUser(text: string) {
    setMessages((m) => [...m, { role: "user", text, time: nowLabel() }]);
  }

  function selectCategory(slug: string, name: string) {
    setForm((f) => ({ ...f, category_slug: slug, category_name: name }));
    pushUser(name);
    pushBot(`Got it — ${name}. What type of ${name.toLowerCase()} issue is it?`);
    setStep("subcategory");
    navigate({ to: "/chat", search: {} });
  }
  function selectSubcategory(slug: string, name: string) {
    setForm((f) => ({ ...f, subcategory_slug: slug }));
    pushUser(name);
    pushBot("Please describe the problem in a few words. Include any details that help us locate and fix it.");
    setStep("description");
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    pushUser(text);

    if (step === "description") {
      setForm((f) => ({ ...f, description: text }));
      pushBot("Thank you. What's your full name?");
      setStep("name");
    } else if (step === "name") {
      setForm((f) => ({ ...f, resident_name: text }));
      pushBot("Your mobile number please (we'll only use it for this complaint).");
      setStep("phone");
    } else if (step === "phone") {
      setForm((f) => ({ ...f, resident_phone: text }));
      pushBot("Which town are you in?");
      setStep("town");
    } else if (step === "address") {
      setForm((f) => ({ ...f, street_address: text }));
      pushBot("Thanks. Submitting your complaint now…");
      setStep("submitting");
      await submit({ ...form, street_address: text });
    }
  }

  function selectTown(name: string) {
    setForm((f) => ({ ...f, town_name: name }));
    pushUser(name);
    pushBot("Which ward are you in? If you're not sure, pick the closest.");
    setStep("ward");
  }

  function selectWard(n: number, label: string) {
    setForm((f) => ({ ...f, ward_number: n }));
    pushUser(label);
    pushBot("What's your street address?");
    setStep("address");
  }

  async function submit(payload: typeof form) {
    try {
      const res = await submitComplaint({
        data: {
          category_slug: payload.category_slug,
          subcategory_slug: payload.subcategory_slug,
          ward_number: payload.ward_number,
          town_name: payload.town_name,
          resident_name: payload.resident_name!,
          resident_phone: payload.resident_phone!,
          street_address: payload.street_address,
          description: payload.description!,
          channel: "web",
        },
      });
      setResult({ reference: res.reference, priority: res.priority, ai_summary: res.ai_summary });
      pushBot(
        `✅ Your complaint has been logged.\n\nReference: ${res.reference}\nPriority: ${res.priority.toUpperCase()}\nRouted to: ${
          res.assigned_department ?? "Customer Care"
        }\n\nWe'll notify you as your case progresses. Save this reference to track it.`
      );
      setStep("done");
    } catch (e) {
      pushBot(`Sorry — we couldn't submit that. ${(e as Error).message}. Please try again.`);
      setStep("address");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-4">
        {/* Chat window */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-primary p-4 text-primary-foreground">
            <img src={crest} alt="" width={40} height={40} className="rounded-md bg-white object-contain p-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Ngwathe Municipality Assistant</div>
              <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online · replies instantly
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-chat-bg p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2 text-sm shadow-card ${
                    m.role === "user"
                      ? "rounded-br-sm bg-whatsapp text-white"
                      : "rounded-bl-sm bg-card text-foreground"
                  }`}
                >
                  {m.text}
                  <div className={`mt-1 text-[10px] ${m.role === "user" ? "text-white/70" : "text-muted-foreground"}`}>
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {step === "submitting" && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2 text-sm text-muted-foreground shadow-card">
                  <Loader2 className="h-4 w-4 animate-spin" /> AI is analysing your report…
                </div>
              </div>
            )}

            {/* Inline choices */}
            {step === "category" && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                {data.categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCategory(c.slug, c.name)}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-card hover:border-primary hover:text-primary"
                  >
                    <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {step === "subcategory" && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                {subs.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSubcategory(s.slug, s.name)}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-card hover:border-primary hover:text-primary"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            {step === "town" && (
              <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
                {data.towns.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTown(t.name)}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-card hover:border-primary hover:text-primary"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            {step === "ward" && (
              <div className="grid grid-cols-3 gap-2 pt-2 sm:grid-cols-5">
                {data.wards.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => selectWard(w.ward_number, `Ward ${w.ward_number}`)}
                    className="rounded-xl border border-border bg-card px-2 py-2 text-sm font-medium text-foreground shadow-card hover:border-primary hover:text-primary"
                    title={w.name}
                  >
                    {w.ward_number}
                  </button>
                ))}
              </div>
            )}

            {step === "done" && result && (
              <div className="rounded-2xl border border-success/40 bg-success/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <div className="font-semibold">Complaint successfully logged</div>
                </div>
                <div className="text-sm text-foreground">
                  <div>
                    Reference: <span className="font-mono font-semibold">{result.reference}</span>
                  </div>
                  {result.ai_summary && <div className="mt-1 text-muted-foreground">AI summary: {result.ai_summary}</div>}
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    to="/track/$ref"
                    params={{ ref: result.reference }}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  >
                    Track this complaint
                  </Link>
                  <Link to="/" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
                    Done
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 border-t border-border bg-card p-3">
            {step === "welcome" || step === "category" || step === "subcategory" || step === "town" || step === "ward" || step === "done" || step === "submitting" ? (
              <div className="flex-1 text-center text-xs text-muted-foreground">
                {step === "done" ? "Start a new report anytime." : "Tap a button above to continue."}
              </div>
            ) : (
              <>
                <button className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-accent" title="Attach (coming soon)">
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={
                    step === "description"
                      ? "Describe the problem…"
                      : step === "name"
                        ? "Your full name"
                        : step === "phone"
                          ? "e.g. +27 82 000 0000"
                          : step === "address"
                            ? "Street address"
                            : "Type your reply…"
                  }
                  className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <button
                  onClick={handleSend}
                  className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <Link to="/" className="mt-4 inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </main>
    </div>
  );
}
