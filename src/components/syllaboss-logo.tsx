export function SyllabossLogo({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <a href={href} aria-label="Syllaboss home" className="inline-flex min-w-0 items-center gap-2 transition-transform active:scale-95">
      <span className="truncate font-display text-xl font-bold tracking-tight text-foreground">
        {compact ? "S" : "Syllaboss"}
      </span>
    </a>
  );
}