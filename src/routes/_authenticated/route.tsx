import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <>
      <SignedIn>
        <Outlet />
      </SignedIn>
      <SignedOut>
        <Navigate to="/auth" search={{ mode: "signin" }} />
      </SignedOut>
    </>
  );
}
