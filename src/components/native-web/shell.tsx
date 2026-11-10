import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Menu, Sparkles, Sun, UserRound, Users, X } from "lucide-react";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { getStudentConversationsServerFn } from "@/lib/community.functions";

export const appTabs = [
  { to: "/dashboard", label: "Today", icon: Sun },
  { to: "/dashboard/library", label: "Library", icon: BookOpen },
  { to: "/dashboard/assistant", label: "Boss AI", icon: Sparkles },
  { to: "/dashboard/community", label: "Peers", icon: Users },
  { to: "/dashboard/space", label: "Your space", icon: UserRound },
];
const secondaryTitles: Record<string, string> = {
  settings: "Settings & promo codes",
  upload: "Share a material",
  materials: "My uploads",
  wallet: "Gift card cashout",
  leaderboard: "Campus leaders",
  pdf: "PDF workshop",
};

export function NativeWebShell({
  children,
  guest = false,
}: {
  children: ReactNode;
  guest?: boolean;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const [chatActive, setChatActive] = useState(false);
  const assistant = path.startsWith("/dashboard/assistant");
  const peers = path.startsWith("/dashboard/community");
  const reader = path.startsWith("/dashboard/preview");
  const immersive = assistant || peers || reader;
  const section = path.split("/").at(-1) || "";
  const secondary = path.startsWith("/dashboard/") ? secondaryTitles[section] : undefined;
  const { data: conversations = [] } = useQuery({
    queryKey: ["native-web-unread", user?.id],
    enabled: !!user,
    queryFn: () => getStudentConversationsServerFn({ data: { userId: user!.id } }),
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  });
  const unread = conversations.reduce(
    (sum: number, c: any) => sum + Number(c.unread_count || 0),
    0,
  );
  useEffect(() => {
    setMenu(false);
    setChatActive(false);
  }, [path]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const el = document.activeElement;
      setKeyboard(
        !!viewport &&
          el instanceof HTMLElement &&
          (el.matches("input,textarea,select") || el.isContentEditable) &&
          window.innerHeight - viewport.height > 140,
      );
    };
    const chat = (event: Event) => setChatActive(Boolean((event as CustomEvent).detail?.active));
    viewport?.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    window.addEventListener("syllaboss-peer-chat", chat);
    return () => {
      viewport?.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      window.removeEventListener("syllaboss-peer-chat", chat);
    };
  }, []);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const down = () => {
      setOffline(true);
      setReconnected(false);
    };
    const up = () => {
      setOffline(false);
      setReconnected(true);
      timeout = setTimeout(() => setReconnected(false), 3500);
    };
    setOffline(!navigator.onLine);
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, []);
  const destination = (to: string) =>
    guest ? (to === "/dashboard/library" ? "/materials" : to === "/dashboard" ? "/" : "/auth") : to;
  const active = (to: string) =>
    to === "/dashboard"
      ? path === "/dashboard"
      : to === "/dashboard/space"
        ? path.startsWith(to) || !!secondary
        : path.startsWith(to) || (guest && to === "/dashboard/library" && path === "/materials");
  const nav = (
    <>
      {appTabs.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={destination(to)}
          aria-current={active(to) ? "page" : undefined}
          className={cn("native-tab", active(to) && "is-active")}
          onClick={() => setMenu(false)}
        >
          <span className="native-tab-icon">
            <Icon aria-hidden="true" />
            {to === "/dashboard/community" && unread > 0 && (
              <span className="native-unread" aria-label={`${unread} unread messages`}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </>
  );
  return (
    <div
      className={cn(
        "native-app",
        immersive && "native-app-immersive",
        assistant && "native-app-ai",
        reader && "native-app-reader",
        chatActive && "native-app-chat",
      )}
    >
      <a href="#app-main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="native-rail" aria-label="App navigation">
        <Link to={destination("/dashboard")} aria-label="Syllaboss Today">
          <SyllabossLogo asDiv />
        </Link>
        <nav>{nav}</nav>
        <p>
          Your learning,
          <br />
          all together.
        </p>
      </aside>
      {secondary && (
        <header className="native-secondary-header">
          <Link
            to="/dashboard/space"
            aria-label="Back to Your space"
            className="native-icon-button"
          >
            <ArrowLeft />
          </Link>
          <span>{secondary}</span>
        </header>
      )}
      <main
        id="app-main-content"
        tabIndex={-1}
        className={cn("native-main", secondary && "native-secondary-main")}
      >
        {children}
      </main>
      {!(assistant || reader || keyboard || chatActive) && (
        <nav className="native-bottom-nav" aria-label="App navigation">
          {nav}
        </nav>
      )}
      {(reader || chatActive) && (
        <button
          className="native-floating-menu native-icon-button"
          aria-label="App navigation"
          onClick={() => setMenu(true)}
        >
          <Menu />
        </button>
      )}
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent className="native-navigation-dialog" aria-describedby={undefined}>
          <DialogTitle className="sr-only">App navigation</DialogTitle>
          <div className="native-menu-heading">
            <SyllabossLogo asDiv />
          </div>
          <nav className="native-app-menu-nav">{nav}</nav>
        </DialogContent>
      </Dialog>
      {(offline || reconnected) && (
        <div className="native-connection" role="status">
          {offline
            ? "You’re offline. Reconnect to keep studying."
            : "Back online. You’re up to date."}
        </div>
      )}
    </div>
  );
}
