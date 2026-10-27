import { ClerkFailed, ClerkLoaded, ClerkLoading, SignIn, SignUp } from "@clerk/clerk-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertCircle, BookOpen, Bot, Coins, Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";

import { SyllabossEmblem, SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { clerkAppearance } from "@/integrations/clerk";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).catch("signin").default("signin") });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Syllaboss" },
      { name: "description", content: "Sign in to Syllaboss or create a free account to save your study profile." },
      { property: "og:title", content: "Sign in or create an account — Syllaboss" },
      { property: "og:description", content: "Save your institution, course and level with a free Syllaboss account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const PERKS = [
  { icon: BookOpen, title: "Verified notes & past questions", sub: "Searchable by school, course and level." },
  { icon: Bot, title: "Boss AI that shows its working", sub: "Step-by-step answers, quizzes and explanations." },
  { icon: Coins, title: "Earn while you learn", sub: "Points for studying and sharing, withdrawable to your bank." },
];

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSignup = mode === "signup";

  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel */}
      <aside className="auth-brand-panel relative hidden overflow-hidden bg-forest text-white lg:flex lg:flex-col lg:justify-between">
        <a href="/" aria-label="Syllaboss home" className="relative inline-flex items-center gap-2.5">
          <SyllabossEmblem className="size-9 brightness-0 invert" />
          <span className="font-display text-2xl font-semibold tracking-tight">Syllaboss</span>
        </a>

        <div className="auth-brand-story relative">
          <p className="eyebrow !text-[#d9c18f]">Make this semester yours</p>
          <h2 className="auth-brand-title">
            Your courses.<br />Your questions.<br /><em>Your next chapter.</em>
          </h2>
          <p className="auth-brand-description">A place to find your materials, work through the hard parts, and keep moving forward.</p>
          <div className="auth-study-sheet">
            <div className="auth-sheet-heading"><span>Your study essentials</span><BookOpen className="size-5" aria-hidden="true" /></div>
            <ul>
              {PERKS.map(({ icon: Icon, title, sub }) => (
                <li key={title}>
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span><strong>{title}</strong><span>{sub}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="auth-brand-footer"><span>Built around your university life.</span><span>© 2026 Syllaboss</span></div>
      </aside>

      {/* Form */}
      <div className="flex min-h-dvh flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-5 sm:px-10">
          <a href="/" aria-label="Syllaboss home" className="lg:hidden">
            <SyllabossLogo />
          </a>
          <span className="ml-auto text-[13px] text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to Syllaboss?"}{" "}
            <a
              href={isSignup ? "/auth?mode=signin" : "/auth?mode=signup"}
              className="ml-1 font-semibold text-ink underline decoration-border underline-offset-4 transition-colors hover:decoration-ink"
            >
              {isSignup ? "Sign in" : "Create account"}
            </a>
          </span>
        </header>

        <main className="flex flex-1 items-start justify-center px-5 pt-8 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:items-center sm:px-10 sm:pt-0">
          <ClerkLoading>
            <AuthLoadingPanel />
          </ClerkLoading>
          <ClerkLoaded>
            <div key={mode} className="route-enter !h-auto w-full max-w-[26rem]">
              {isSignup ? (
                <SignUp
                  appearance={clerkAppearance}
                  routing="virtual"
                  signInUrl="/auth?mode=signin"
                  forceRedirectUrl="/dashboard"
                  fallbackRedirectUrl="/dashboard"
                  fallback={<AuthLoadingPanel label="Preparing account creation…" />}
                />
              ) : (
                <SignIn
                  appearance={clerkAppearance}
                  routing="virtual"
                  signUpUrl="/auth?mode=signup"
                  forceRedirectUrl="/dashboard"
                  fallbackRedirectUrl="/dashboard"
                  fallback={<AuthLoadingPanel label="Preparing sign in…" />}
                />
              )}
            </div>
          </ClerkLoaded>
          <ClerkFailed>
            <AuthFailurePanel />
          </ClerkFailed>
        </main>
      </div>
    </div>
  );
}

function AuthLoadingPanel({ label = "Connecting to secure sign in…" }: { label?: string }) {
  return (
    <div
      className="grid w-full max-w-[26rem] justify-items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-[var(--elev-1)]"
      role="status"
      aria-live="polite"
    >
      <span className="grid size-11 place-items-center rounded-2xl bg-forest/8 text-forest">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        This usually takes a moment.
      </p>
    </div>
  );
}

function AuthFailurePanel() {
  return (
    <div
      className="grid w-full max-w-[26rem] justify-items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-[var(--elev-1)]"
      role="alert"
    >
      <span className="grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" aria-hidden="true" />
      </span>
      <h1 className="font-display text-xl font-medium text-ink">Sign in didn’t load</h1>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        Check your connection, then try again. If the problem continues, the sign-in service may be temporarily unavailable.
      </p>
      <Button className="mt-1 min-h-11 gap-2" onClick={() => window.location.reload()}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
