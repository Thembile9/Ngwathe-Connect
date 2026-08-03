import { Link } from "@tanstack/react-router";
import crest from "@/assets/logo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={crest} alt="Ngwathe Municipality logo" width={44} height={44} className="rounded-md object-contain" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-primary">Ngwathe Local Municipality</div>
            <div className="text-xs text-muted-foreground">Service Delivery Portal</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground">Home</Link>
          <Link to="/chat" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground">Report Issue</Link>
          <Link to="/track" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground">Track Complaint</Link>
          <Link to="/notices" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground">Notices</Link>
          <Link to="/admin" className="ml-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Admin Dashboard</Link>
        </nav>
        <Link to="/chat" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground md:hidden">Report</Link>
      </div>
    </header>
  );
}
