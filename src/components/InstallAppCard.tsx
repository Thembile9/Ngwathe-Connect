import { useEffect, useState } from "react";
import { Share, Plus, Smartphone } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Prompts residents to add the app to their home screen. */
export function InstallAppCard() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return null;

  return (
    <section className="rounded-xl border border-border bg-secondary p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Smartphone className="h-4 w-4 text-primary" /> Install Ngwathe Connect
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Add the app to your home screen so you can report a fault without opening a browser.
      </p>
      {deferred ? (
        <button
          onClick={async () => {
            await deferred.prompt();
            setDeferred(null);
          }}
          className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Add to home screen
        </button>
      ) : isIos ? (
        <p className="mt-2.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          Tap <Share className="inline h-3.5 w-3.5" /> <strong className="text-foreground">Share</strong> then
          <Plus className="inline h-3.5 w-3.5" /> <strong className="text-foreground">Add to Home Screen</strong>
        </p>
      ) : (
        <p className="mt-2.5 text-xs text-muted-foreground">
          Open your browser menu and choose <strong className="text-foreground">Add to Home screen</strong>.
        </p>
      )}
    </section>
  );
}
