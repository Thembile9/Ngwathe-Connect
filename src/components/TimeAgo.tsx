import { useEffect, useState } from "react";
import { formatDate, timeAgo } from "@/lib/format";

/**
 * Relative time is clock-dependent, so it can never match between server render
 * and hydration. Render the absolute timestamp first, swap after mount.
 */
export function TimeAgo({
  value,
  className,
}: {
  value: string | Date | null | undefined;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!value) return <span className={className}>—</span>;
  return (
    <span className={className} title={formatDate(value)} suppressHydrationWarning>
      {mounted ? timeAgo(value) : formatDate(value)}
    </span>
  );
}
