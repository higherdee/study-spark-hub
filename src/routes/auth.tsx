import { SignIn, SignUp } from "@clerk/clerk-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { SyllabossLogo } from "@/components/syllaboss-logo";
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
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="rounded-full bg-background/95 px-3 py-2 self-start">
          <SyllabossLogo />
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Study with direction</p>
          <h2 className="mt-5 font-display text-5xl leading-tight">
            Your institution, course and level — <em className="text-accent">saved in one place.</em>
          </h2>
        </div>
        <p className="text-sm opacity-80">© 2026 Syllaboss</p>
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent/20 blur-3xl" />
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="mb-8 lg:hidden self-start">
            <SyllabossLogo />
          </div>
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
  );
}
