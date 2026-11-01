import { toast } from "sonner";
export function reportStudyError(error: unknown, fallback: string, options?: Parameters<typeof toast.error>[1]) {
  const message = error instanceof Error ? error.message : "";
  const limited = /^(Free accounts|You have used today|Your daily AI|Studying a library material|You have downloaded six)/i.test(message);
  toast.error(limited ? message : fallback, options);
  if (limited && typeof window !== "undefined") window.dispatchEvent(new Event("syllaboss:upgrade"));
}
