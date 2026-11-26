import crest from "@/assets/logo";

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="col-span-2">
          <div className="flex items-center gap-3">
            <img src={crest} alt="" width={48} height={48} className="rounded-md bg-white object-contain p-0.5" />
            <div>
              <div className="font-display text-lg font-semibold">Ngwathe Local Municipality</div>
              <div className="text-xs text-primary-foreground/70">Progress Through Unity</div>
            </div>
          </div>
          <p className="mt-3 max-w-md text-sm text-primary-foreground/80">
            Serving the communities of Parys, Vredefort, Heilbron, Koppies, Edenville and surrounding areas.
          </p>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">Emergencies</div>
          <ul className="space-y-1 text-sm text-primary-foreground/80">
            <li>Fire &amp; Rescue: 10177</li>
            <li>Police: 10111</li>
            <li>Ambulance: 10177</li>
            <li>Municipal 24/7: 056 816 2500</li>
          </ul>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">Contact</div>
          <ul className="space-y-1 text-sm text-primary-foreground/80">
            <li>1 Liebenberg St, Parys</li>
            <li>info@ngwathe.gov.za</li>
            <li>+27 56 816 2500</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-primary-foreground/60">
        © {new Date().getFullYear()} Ngwathe Local Municipality. Powered by AI service delivery platform.
      </div>
    </footer>
  );
}
