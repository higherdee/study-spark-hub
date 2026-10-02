import {
  ClerkProvider,
  useUser,
  useClerk,
  useAuth as useClerkAuth,
} from "@clerk/clerk-react";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { CLERK_PUBLISHABLE_KEY } from "@/integrations/clerk";
import { upsertProfile } from "@/integrations/turso/client";

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
    if (authUser && user) {
      upsertProfile({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata.full_name,
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
