import { SignedIn, SignedOut, ClerkLoaded, ClerkLoading } from "@clerk/clerk-react";
import { createFileRoute, Outlet, Navigate, useLocation } from "@tanstack/react-router";
import { PageBreathingLoader } from "@/components/syllaboss-logo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location=useLocation();
  return (
    <>
      <ClerkLoading>
        <PageBreathingLoader message="Entering Syllaboss..." />
      </ClerkLoading>
      <ClerkLoaded>
        <SignedIn>
          <Outlet />
        </SignedIn>
        <SignedOut>
          <Navigate to="/auth" search={{ mode: "signin", redirect: location.href }} />
        </SignedOut>
      </ClerkLoaded>
    </>
  );
}
