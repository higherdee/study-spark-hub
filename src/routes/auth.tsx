import { SignIn, SignUp } from "@clerk/clerk-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, Bot, Coins } from "lucide-react";
import { z } from "zod";

import { SyllabossEmblem, SyllabossLogo } from "@/components/syllaboss-logo";
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
      if (isSignup) {
        navigate({ to: "/onboarding" });
      } else {
        navigate({ to: "/dashboard" });
      }
    }
  }, [user, isSignup, navigate]);

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <SyllabossEmblem
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-16 size-[34rem] opacity-[0.06]"
        />
        <a href="/" aria-label="Syllaboss home" className="relative inline-flex items-center gap-2.5">
          <SyllabossEmblem className="size-9" />
          <span className="font-display text-2xl font-semibold tracking-tight">Syllaboss</span>
        </a>

        <div className="relative max-w-md">
          <p className="eyebrow !text-white/50">Study with direction</p>
          <h2 className="mt-4 font-display text-[2.75rem] font-medium leading-[1.05] tracking-tight">
            Everything your course needs, in one quiet place.
          </h2>
          <ul className="mt-9 space-y-5">
            {PERKS.map(({ icon: Icon, title, sub }, i) => (
              <li
                key={title}
                className="flex items-start gap-4"
                style={{ animation: `rise 0.6s var(--ease-out) ${200 + i * 90}ms both` }}
              >
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/5">
                  <Icon className="size-[18px] text-[#8fd9b6]" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">{title}</span>
                  <span className="block text-sm text-white/60">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© 2026 Syllaboss</p>
      </aside>

      {/* Form */}
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <span className="lg:hidden">
            <SyllabossLogo />
          </span>
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

        <main className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
          <div key={mode} className="route-enter !h-auto w-full max-w-[26rem]">
            {isSignup ? (
              <SignUp
                appearance={clerkAppearance}
                routing="virtual"
                signInUrl="/auth?mode=signin"
                forceRedirectUrl="/onboarding"
                fallbackRedirectUrl="/onboarding"
              />
            ) : (
              <SignIn
                appearance={clerkAppearance}
                routing="virtual"
                signUpUrl="/auth?mode=signup"
                forceRedirectUrl="/dashboard"
                fallbackRedirectUrl="/dashboard"
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
