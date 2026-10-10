export const GA_MEASUREMENT_ID = "G-B39BXVTQXG";
export const GA_CONSOLE_URL = `https://analytics.google.com/analytics/web/`;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Track custom event to Google Analytics (gtag.js)
 */
export function trackGAEvent(
  action: string,
  category: string,
  label?: string,
  value?: number,
  params?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
      ...params,
    });
  }
}

/**
 * Track SPA page view to Google Analytics
 */
export function trackGAPageView(path: string, title?: string) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: path,
      page_title: title || (typeof document !== "undefined" ? document.title : undefined),
      page_location: typeof window !== "undefined" ? window.location.href : undefined,
    });
  }
}

/**
 * Helper for testing connection from Admin panel
 */
export function sendGATestPing(adminEmail?: string) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", "admin_diagnostic_ping", {
      event_category: "admin_test",
      event_label: "Admin Dashboard Verification",
      admin_user: adminEmail || "syllaboss_admin",
      timestamp: new Date().toISOString(),
    });
    return true;
  }
  return false;
}
