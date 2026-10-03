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
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Clean Top Navigation */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <SyllabossLogo />
        <span className="text-xs font-medium text-muted-foreground">
          {isSignup ? "Already have an account?" : "New to Syllaboss?"}{" "}
          <a
            href={isSignup ? "/auth?mode=signin" : "/auth?mode=signup"}
            className="text-primary hover:underline font-semibold ml-1"
          >
            {isSignup ? "Sign in" : "Create account"}
          </a>
        </span>
      </header>

      {/* Centered Auth Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
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

      {/* Subtle Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground border-t border-border/40">
        <p>© 2026 Syllaboss · Verified student notes, past questions & AI study tools</p>
      </footer>
    </div>
  );
}
