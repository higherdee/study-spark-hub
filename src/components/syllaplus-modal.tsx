import { ArrowRight, BookOpen, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SyllaPlusModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/** Informational state until verified subscription checkout is available. */
export function SyllaPlusModal({ open, onClose }: SyllaPlusModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md gap-5">
        <DialogHeader className="gap-3 text-left">
          <span className="grid size-11 place-items-center rounded-2xl bg-brass-soft text-brass-ink">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <div className="space-y-1.5">
            <p className="eyebrow text-brass-ink">SyllaPlus</p>
            <DialogTitle className="font-display text-2xl font-medium tracking-tight text-ink">
              Membership is taking a pause
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              Subscription checkout is not available yet. No payment will be taken, and your current account and points will stay as they are.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/60 p-4">
          <p className="text-sm font-semibold text-ink">You can keep studying here</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Your course library, study tools, and peer spaces remain available with your current account.
          </p>
          <a href="/materials" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest hover:text-brand">
            <BookOpen aria-hidden="true" className="size-4" /> Browse course materials <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>

        <DialogFooter>
          <Button className="min-h-11 w-full sm:w-auto" onClick={onClose}>Back to my studies</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}