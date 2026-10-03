import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  X,
  Settings,
  FileStack,
  Shield,
  HelpCircle,
  LogOut,
  Sparkles,
  GraduationCap,
  Timer,
  Share2,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

  if (!open) return null;

  const name = profile?.full_name || user?.email?.split("@")[0] || "Student";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Side Slide-Over Drawer */}
      <div className="relative z-10 flex w-full max-w-xs flex-1 flex-col justify-between bg-card p-6 shadow-2xl animate-in slide-in-from-left duration-300">
        <div className="space-y-6">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Syllaboss
            </span>
            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Student Profile Card */}
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-xs">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{profile?.email || user?.email}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate">{profile?.institution || "University"}</span>
              <span className="font-semibold text-primary">{profile?.points ?? 0} {POINTS_NAME}</span>
            </div>

            {profile?.sylla_plus && (
              <div className="mt-2 flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 w-fit">
                <Sparkles className="size-3" /> {PLAN_NAME} Active
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-sm font-medium">
            <Link
              to="/dashboard/materials"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-foreground hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileStack className="size-4 text-primary" />
                <span>My Uploads & Notes</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              to="/dashboard/settings"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-foreground hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="size-4 text-primary" />
                <span>Settings & Preferences</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>

            <button
              onClick={() => {
                setShowFaqModal(true);
              }}
              className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-foreground hover:bg-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="size-4 text-primary" />
                <span>Help & FAQs</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>

            {isAdmin && (
              <Link
                to="/admin"
                onClick={onClose}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-amber-800 bg-amber-500/10 border border-amber-500/20 font-semibold transition-colors mt-2"
              >
                <div className="flex items-center gap-3">
                  <Shield className="size-4 text-amber-600" />
                  <span>Admin Control Center</span>
                </div>
                <ChevronRight className="size-4 text-amber-700" />
              </Link>
            )}
          </nav>
        </div>

        {/* Footer with Sign Out */}
        <div className="pt-6 border-t border-border/60 space-y-3">
          <Button
            variant="ghost"
            onClick={() => {
              onClose();
              signOut();
            }}
            className="w-full justify-start gap-2.5 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold"
          >
            <LogOut className="size-4" /> Sign out of account
          </Button>

          <p className="px-2 text-[10px] text-muted-foreground">
            Syllaboss v2.4 · Academic Excellence
          </p>
        </div>
      </div>

      {/* FAQs Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display text-lg font-bold text-foreground">Frequently Asked Questions</h3>
              <button
                onClick={() => setShowFaqModal(false)}
                className="grid size-7 place-items-center rounded-full bg-secondary text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 text-xs leading-relaxed text-muted-foreground pr-1">
              <div>
                <strong className="text-foreground text-sm block">How do I earn SyllaPoints?</strong>
                You earn +25 points per verified upload, +5 points per 30 minutes studying on the site, +5 points when a peer downloads your material, and +2 points per view.
              </div>
              <div>
                <strong className="text-foreground text-sm block">Can I download files directly?</strong>
                Yes! Every verified material has a direct Download button that saves the document straight to your phone or laptop storage.
              </div>
              <div>
                <strong className="text-foreground text-sm block">What is the minimum withdrawal?</strong>
                The minimum withdrawal is 17,500 SyllaPoints, which can be withdrawn directly to your Nigerian bank account.
              </div>
              <div>
                <strong className="text-foreground text-sm block">How does Boss AI work?</strong>
                Boss AI is powered by Puter AI. You can attach documents to automatically categorize and register them into the campus library, generate MCQ or theory practice quizzes with automated marking, and study flashcards.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
