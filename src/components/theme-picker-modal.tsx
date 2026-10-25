import { Moon, Sun, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemePickerModalProps {
  open: boolean;
  onConfirm: () => void;
}

export function ThemePickerModal({ open, onConfirm }: ThemePickerModalProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="max-w-md p-6 sm:p-8">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
            <Sun className="size-6 dark:hidden text-brass" />
            <Moon className="size-6 hidden dark:block text-brand" />
          </div>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight text-foreground">
            Choose Your Appearance
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Select your preferred display theme for studying and browsing materials. You can change this anytime from the top bar.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid grid-cols-2 gap-3.5">
          {/* Light Mode Option */}
          <button
            type="button"
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
            className={cn(
              "group relative flex flex-col items-center rounded-2xl border-2 p-4 text-center transition-all",
              theme === "light"
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                : "border-border/60 bg-secondary/30 hover:border-border hover:bg-secondary/60"
            )}
          >
            <div className="grid size-12 place-items-center rounded-xl bg-white text-brass shadow-xs mb-3">
              <Sun className="size-6" />
            </div>
            <p className="font-semibold text-sm text-foreground">Light Mode</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Crisp, paper-like</p>
            {theme === "light" && (
              <div className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </div>
            )}
          </button>

          {/* Dark Mode Option */}
          <button
            type="button"
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
            className={cn(
              "group relative flex flex-col items-center rounded-2xl border-2 p-4 text-center transition-all",
              theme === "dark"
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                : "border-border/60 bg-secondary/30 hover:border-border hover:bg-secondary/60"
            )}
          >
            <div className="grid size-12 place-items-center rounded-xl bg-ink text-brand shadow-xs mb-3">
              <Moon className="size-6" />
            </div>
            <p className="font-semibold text-sm text-foreground">Dark Mode</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Midnight OLED</p>
            {theme === "dark" && (
              <div className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </div>
            )}
          </button>
        </div>

        <Button
          onClick={onConfirm}
          className="mt-6 w-full h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        >
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
