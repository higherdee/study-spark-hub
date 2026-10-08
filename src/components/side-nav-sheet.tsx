import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  X,
  LayoutDashboard,
  BookOpen,
  Bot,
  Upload,
  FileStack,
  Wallet,
  Trophy,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useIsAdmin } from "@/lib/profile";
import { PLAN_NAME, POINTS_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SideNavSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SideNavSheet({ open, onClose }: SideNavSheetProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const [showFaqModal, setShowFaqModal] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  if (!open) return null;

  const name = profile?.full_name || user?.email?.split("@")[0] || "Student";
  const initial = name.charAt(0).toUpperCase();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "University Library", href: "/dashboard/library", icon: BookOpen },
    { label: "Boss AI Study Suite", href: "/dashboard/assistant", icon: Bot },
    { label: "Upload Material", href: "/dashboard/upload", icon: Upload },
    { label: "My Uploads & Notes", href: "/dashboard/materials", icon: FileStack },
    { label: "Wallet & Points", href: "/dashboard/wallet", icon: Wallet },
    { label: "Campus Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Standard App Navigation Drawer */}
      <div className="relative z-10 flex w-[290px] max-w-[85vw] flex-1 flex-col justify-between bg-white text-[#151d1a] shadow-2xl animate-in slide-in-from-left duration-250 border-r border-[#dce5df]">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7f0eb]">
            <SyllabossLogo />
            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-[#5a6660] hover:bg-[#edf6f0] hover:text-[#00110a] transition-colors"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* User Account Snippet */}
          <div className="p-4 bg-[#edf6f0]/60 border-b border-[#e7f0eb]">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0d281e] text-[#c6ebd9] font-bold text-sm shadow-xs">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#00110a]">{name}</p>
                <p className="truncate text-xs text-[#5a6660]">{profile?.institution || "Nigerian University"}</p>
              </div>
            </div>

            <div className="mt-2.5 pt-2 flex items-center justify-between text-xs border-t border-[#dce5df]/60">
              <span className="text-[#5a6660]">Points Balance:</span>
              <span className="font-bold text-[#1b7a4e]">{profile?.points ?? 0} {POINTS_NAME}</span>
            </div>

            {profile?.sylla_plus && (
              <div className="mt-2 flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 w-fit">
                <Sparkles className="size-3" /> {PLAN_NAME} Active
              </div>
            )}
          </div>

          {/* Main Navigation List - Basic Uniform Generic Drawer */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <Icon className="size-4 shrink-0 text-slate-500" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="my-2 border-t border-slate-200" />

            <button
              type="button"
              onClick={() => {
                setShowFaqModal(true);
              }}
              className="w-full flex items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
            >
              <HelpCircle className="size-4 text-slate-500 shrink-0" />
              <span>Help & FAQs</span>
            </button>

            {isAdmin && (
              <Link
                to="/admin"
                onClick={onClose}
                className="flex items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Shield className="size-4 text-slate-500 shrink-0" />
                <span>Admin Control</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-[#e7f0eb] space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClose();
              signOut();
            }}
            className="w-full justify-start gap-2.5 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-semibold h-9"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
          <p className="px-2 text-[10px] text-[#5a6660] font-mono">
            Syllaboss v2.4 · Academic Excellence
          </p>
        </div>
      </div>

      {/* FAQs Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#dce5df]">
            <div className="flex items-center justify-between border-b border-[#e7f0eb] pb-3">
              <h3 className="font-display text-lg font-bold text-[#00110a]">Frequently Asked Questions</h3>
              <button
                onClick={() => setShowFaqModal(false)}
                className="grid size-7 place-items-center rounded-full bg-[#edf6f0] text-[#5a6660] hover:text-[#00110a]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3.5 text-xs leading-relaxed text-[#424844] pr-1">
              <div>
                <strong className="text-[#00110a] text-sm block">How do I earn SyllaPoints?</strong>
                You earn +25 points per verified upload, +5 points per 30 minutes studying on the site, +5 points when a peer downloads your material, and +2 points per view.
              </div>
              <div>
                <strong className="text-[#00110a] text-sm block">Can I download files directly?</strong>
                Yes! Every verified material has a direct Download button that saves the document straight to your phone or laptop storage.
              </div>
              <div>
                <strong className="text-[#00110a] text-sm block">What is the minimum withdrawal?</strong>
                The minimum withdrawal is 17,500 SyllaPoints, which can be withdrawn directly to your Nigerian bank account.
              </div>
              <div>
                <strong className="text-[#00110a] text-sm block">How does Boss AI work?</strong>
                Boss AI is powered by Google Gemini. You can preview study materials, split the screen to chat with documents in real time, highlight text to explain, send voicenotes, and generate practice quizzes.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
