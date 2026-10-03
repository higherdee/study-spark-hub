/**
 * Native Device Push & Browser Notification Utility
 * Sends real notifications to the student's operating system / device
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  if (Notification.permission !== "denied") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

export const requestDeviceNotificationPermission = requestNotificationPermission;

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export const isDeviceNotificationSupported = isNotificationSupported;

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function sendDeviceNotification(title: string, options?: {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: unknown;
}): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return false;
    }

    const nOpts: NotificationOptions = {
      icon: options?.icon || "/favicon.png",
    };
    if (options?.body) nOpts.body = options.body;
    if (options?.badge) nOpts.badge = options.badge;
    if (options?.tag) nOpts.tag = options.tag;
    if (options?.data !== undefined) nOpts.data = options.data;

    // Try service worker first for mobile background delivery
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.showNotification) {
          await registration.showNotification(title, nOpts);
          return true;
        }
      } catch {
        // Fall back to standard Notification constructor
      }
    }

    // Standard desktop / browser notification
    new Notification(title, nOpts);
    return true;
  } catch (err) {
    console.warn("Failed to trigger native device notification:", err);
    return false;
  }
}
