import {
  ClerkProvider,
  useUser,
  useClerk,
  useAuth as useClerkAuth,
} from "@clerk/clerk-react";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { CLERK_PUBLISHABLE_KEY } from "@/integrations/clerk";
import { upsertProfileServerFn } from "@/lib/profile.functions";

export type AuthUser = {
  id: string;
  email: string | null;
  user_metadata: {
    full_name: string;
    avatar_url?: string;
  };
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  clerkUser: ReturnType<typeof useUser>["user"];
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
  getToken: async () => null,
  clerkUser: null,
});

function AuthInternalProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useClerkAuth();

  const authUser: AuthUser | null = useMemo(() => {
    if (!isLoaded || !isSignedIn || !user) return null;
    return {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      user_metadata: {
        full_name: user.fullName || user.username || user.firstName || "Student",
        avatar_url: user.imageUrl,
      },
    };
  }, [isLoaded, isSignedIn, user]);

  // Sync profile into Turso database on sign in
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const authenticatedFetch: typeof window.fetch = async (input, init) => {
      const requestUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href);
      if (requestUrl.origin !== window.location.origin) return originalFetch(input, init);

      const token = await getToken();
      if (!token) return originalFetch(input, init);
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
      headers.set("Authorization", `Bearer ${token}`);
      return originalFetch(input, { ...init, headers });
    };
    window.fetch = authenticatedFetch;
    return () => {
      if (window.fetch === authenticatedFetch) window.fetch = originalFetch;
    };
  }, [getToken]);

  useEffect(() => {
    if (authUser && user) {
      upsertProfileServerFn({
        data: {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata.full_name,
        },
      }).catch((err) => {
        console.error("Failed to sync profile to Turso:", err);
      });
    }
  }, [authUser, user]);

  return (
    <AuthContext.Provider
      value={{
        user: authUser,
        loading: !isLoaded,
        signOut: async () => {
          await signOut();
        },
        getToken: async () => {
          return await getToken();
        },
        clerkUser: user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AuthInternalProvider>{children}</AuthInternalProvider>
    </ClerkProvider>
  );
}

export const useAuth = () => useContext(AuthContext);
