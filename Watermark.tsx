import crest from "@/assets/logo";

/**
 * Faint municipal logo watermark placed behind page content.
 * Purely decorative — never announced to screen readers.
 */
export function Watermark({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <img
        src={crest}
        alt=""
        className="absolute left-1/2 top-1/2 w-[min(70%,420px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.045] mix-blend-multiply"
      />
    </div>
  );
}
