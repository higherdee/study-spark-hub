import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  ChevronRight,
  CreditCard,
  FileStack,
  Gift,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Trophy,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin, useProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import { getPointsLedger } from "@/integrations/turso/client";
import { useGuide } from "@/components/onboarding/guide-context";
import { SyllaPlusModal } from "@/components/syllaplus-modal";
import { NotificationsDrawer } from "@/components/notifications-drawer";
import { Switch } from "@/components/ui/switch";
import { NativePageTitle, useSavedMaterials } from "@/components/native-web/screens";
export function YourSpace() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { theme, setTheme } = useTheme();
  const { openGuide } = useGuide();
  const { saved } = useSavedMaterials();
  const [plus, setPlus] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const { data: ledger = [] } = useQuery({
    queryKey: ["ledger", user?.id],
    enabled: !!user,
    queryFn: () => getPointsLedger(user!.id),
  });
  const items = [
    {
      label: "Student profile",
      detail: "Your course and institution",
      icon: UserRound,
      action: openGuide,
    },
    {
      label: "SyllaPlus membership",
      detail: "Plans, payments and renewal",
      icon: CreditCard,
      action: () => setPlus(true),
    },
    {
      label: "Gift card cashout",
      detail: "Redeem points for a gift card",
      icon: Gift,
      to: "/dashboard/wallet",
    },
    {
      label: "PDF workshop",
      detail: "Combine, arrange and export your study PDFs",
      icon: FileStack,
      to: "/dashboard/pdf",
    },
    {
      label: "Notifications",
      detail: "Rewards, updates and announcements",
      icon: Bell,
      action: () => setNotifications(true),
    },
    {
      label: "Settings & promo codes",
      detail: "Study preferences, rewards and your account",
      icon: Settings,
      to: "/dashboard/settings",
    },
    {
      label: "Share a material",
      detail: "Help the next student",
      icon: Upload,
      to: "/dashboard/upload",
    },
    {
      label: "Study together",
      detail: "Your course, your people",
      icon: Users,
      to: "/dashboard/community",
    },
  ];
  return (
    <section className="native-page native-space">
      <NativePageTitle eyebrow="A place for your progress" title="Your space." />
      <div className="native-space-profile">
        <span className="native-space-avatar">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Your profile"
              className="size-full rounded-[21px] object-cover"
            />
          ) : (
            <UserRound />
          )}
        </span>
        <div>
          <strong>{profile?.full_name || "Syllaboss student"}</strong>
          <p>{profile?.course || "Your learning, all together."}</p>
        </div>
      </div>
      <div className="native-space-columns">
        <div>
          <div className="native-space-stats">
            {[
              ["Study minutes", profile?.study_minutes || 0],
              ["Points", profile?.points || 0],
              ["Day streak", profile?.current_streak || 0],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{Number(value).toLocaleString()}</strong>
              </div>
            ))}
          </div>
          <div className="native-space-menu">
            {items.map(({ label, detail, icon: Icon, to, action }) => {
              const content = (
                <>
                  <Icon />
                  <span>
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                  <ChevronRight />
                </>
              );
              return to ? (
                <Link key={label} to={to} className="native-space-item">
                  {content}
                </Link>
              ) : (
                <button key={label} onClick={action} className="native-space-item">
                  {content}
                </button>
              );
            })}
          </div>
        </div>
        <div className="native-space-extra">
          <section>
            <button className="native-text-button" onClick={() => setTheme("system")}>
              <Monitor className="size-5" />
              Use device appearance
            </button>
            <label className="native-appearance-switch">
              <span className="flex items-center gap-3">
                <Moon className="size-5" />
                Dark appearance
              </span>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(value) => setTheme(value ? "dark" : "light")}
              />
            </label>
          </section>
          <section>
            <header className="native-section-heading">
              <h2>Saved for later</h2>
              <BookOpen className="size-5 text-primary" />
            </header>
            {saved.length ? (
              <div className="native-link-list">
                {saved.map((m) => (
                  <Link
                    key={m.id}
                    to="/dashboard/preview"
                    search={{ id: m.id }}
                    className="flex min-h-12 items-center justify-between gap-4 text-sm"
                  >
                    <span>{m.title}</span>
                    <ChevronRight className="size-4 shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                Your saved materials live here. Bookmark a read from the library to get started.
              </p>
            )}
          </section>
          <section>
            <header className="native-section-heading">
              <h2>Recent activity</h2>
            </header>
            {ledger.slice(0, 8).map((row) => (
              <div key={row.id} className="native-activity-row">
                <span>{row.reason}</span>
                <strong>
                  {row.amount > 0 ? "+" : ""}
                  {row.amount} pts
                </strong>
              </div>
            ))}
            {!ledger.length && (
              <p className="text-sm text-muted-foreground">Your study progress will appear here.</p>
            )}
          </section>
          <Link className="native-space-item" to="/dashboard/leaderboard">
            <Trophy />
            <span>
              <strong>Campus leaders</strong>
              <small>Lifetime points and time well spent</small>
            </span>
            <ChevronRight />
          </Link>
          <Link to="/dashboard/materials" className="native-text-button">
            <FileStack className="size-5" />
            My uploads
          </Link>
          {isAdmin && (
            <Link to="/admin" className="native-text-button">
              Admin console
              <ChevronRight className="size-4" />
            </Link>
          )}
          <button className="native-text-button" onClick={() => void signOut()}>
            <LogOut className="size-5" />
            Sign out
          </button>
        </div>
      </div>
      <SyllaPlusModal open={plus} onClose={() => setPlus(false)} />
      <NotificationsDrawer open={notifications} onClose={() => setNotifications(false)} />
    </section>
  );
}
