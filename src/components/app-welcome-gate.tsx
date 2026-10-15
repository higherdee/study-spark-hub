import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, BookOpen, ShieldCheck } from "lucide-react";
import { SyllabossEmblem } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";

export function AppWelcomeGate() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-6 sm:p-8 animate-page-zoom-in font-sans">
      {/* Top spacing / subtle brand mark */}
      <div className="w-full flex items-center justify-center pt-8">
        <div className="flex items-center gap-2">
          <SyllabossEmblem className="size-9" />
          <span className="font-headline text-2xl font-bold tracking-tight text-forest">
            Syllaboss
          </span>
        </div>
      </div>

      {/* Hero Welcome Presentation */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center my-auto py-8">
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-full bg-accent/50 blur-xl animate-pulse pointer-events-none" />
          <div className="relative size-24 rounded-3xl bg-white border border-border shadow-md flex items-center justify-center animate-breathe-zoom">
            <SyllabossEmblem className="size-16" />
          </div>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Welcome to Syllaboss
        </h1>

        <p className="mt-3 text-sm text-ink-soft leading-relaxed max-w-xs">
          Your campus course materials, verified past questions, and 24/7 AI study partner — always in your pocket.
        </p>

        {/* Feature badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-moss">
          <span className="px-3 py-1 rounded-full bg-muted border border-border/70 flex items-center gap-1">
            <BookOpen className="size-3 text-brand" /> Past Questions
          </span>
          <span className="px-3 py-1 rounded-full bg-muted border border-border/70 flex items-center gap-1">
            <Sparkles className="size-3 text-brand" /> Boss AI
          </span>
          <span className="px-3 py-1 rounded-full bg-muted border border-border/70 flex items-center gap-1">
            <ShieldCheck className="size-3 text-brand" /> Verified Notes
          </span>
        </div>
      </div>

      {/* Bottom Action Area: Log In & Create Account */}
      <div className="w-full max-w-sm mx-auto flex flex-col gap-3 pb-6">
        <Button
          asChild
          className="w-full h-12 rounded-full bg-forest hover:bg-ink text-white font-bold text-sm shadow-md"
        >
          <Link to="/auth" search={{ mode: "signin" }}>
            Log In
            <ArrowRight className="size-4 ml-1.5" />
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          className="w-full h-12 rounded-full border border-border bg-white hover:bg-muted text-ink font-semibold text-sm shadow-xs"
        >
          <Link to="/auth" search={{ mode: "signup" }}>
            Create Account
          </Link>
        </Button>

        <p className="text-center text-[11px] text-muted-foreground mt-2">
          Fast offline access · Instant study rewards
        </p>
      </div>
    </div>
  );
}
