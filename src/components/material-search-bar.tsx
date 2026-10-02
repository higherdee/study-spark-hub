import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MaterialSearchBar({ initial = "", className }: { initial?: string; className?: string }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    navigate({ to: "/materials", search: { q: q.trim() } });
  }
  return (
    <form onSubmit={onSubmit} role="search" className={cn("flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-soft", className)}>
      <Search className="ml-3 size-5 shrink-0 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search notes, past questions, course codes…"
        aria-label="Search materials"
        className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
      <Button type="submit" className="h-11 rounded-full px-6">Search</Button>
    </form>
  );
}
