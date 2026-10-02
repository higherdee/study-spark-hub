import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
      aria-label="Toggle dark/light mode"
      className={cn(
        "relative grid size-8 place-items-center rounded-full border border-border/60 bg-card/80 text-foreground backdrop-blur-md transition-all duration-300 active:scale-90 hover:bg-card hover:shadow-xs",
        className
      )}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400" />
    </button>
  );
}
