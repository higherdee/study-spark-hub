import courses from "@/data/courses.json";
import institutions from "@/data/institutions.json";
import type { SearchOption } from "@/components/search-select";

export const POINTS_NAME = "SyllaPoints";
export const PLAN_NAME = "SyllaPlus";

// SyllaPlus 1.3x Earning Multiplier
export const SYLLAPLUS_EARNINGS_MULTIPLIER = 1.3;
export const SYLLAPLUS_PRICE_NAIRA = 7999;

// Regional & International Pricing Models
export const REGIONAL_COUNTRIES = [
  // Africa
  "Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Rwanda", "Uganda", "Tanzania",
  "Ethiopia", "Cameroon", "Senegal", "Ivory Coast", "Morocco", "Algeria", "Tunisia",
  // South Asia
  "India", "Pakistan", "Nepal"
];

export const SYLLAPLUS_PRICING = {
  regional: {
    currency: "NGN",
    symbol: "₦",
    weekly: 2499,
    monthly: 7999,
    yearly: 80000,
  },
  international: {
    currency: "USD",
    symbol: "$",
    monthly: 13.99,
    yearly: 119.99,
  },
};

// Economics:
// Regional (Africa, India, Pakistan, Nepal): 1 SyllaPoint = 0.83 NGN
// International: 1 SyllaPoint = $0.004 USD (0.4 cent)
export const POINT_VALUE_NAIRA = 0.83;
export const POINT_VALUE_USD = 0.004;
export const POINTS_PER_NAIRA = 1.2;

export const pointsToNaira = (points: number) => Math.round(points * POINT_VALUE_NAIRA);
export const nairaToPoints = (naira: number) => Math.round(naira / POINT_VALUE_NAIRA);

export const pointsToUsd = (points: number) => Number((points * POINT_VALUE_USD).toFixed(2));
export const usdToPoints = (usd: number) => Math.round(usd / POINT_VALUE_USD);

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

export const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

export const USD_TO_NAIRA_EXCHANGE_RATE = 1500;

export interface GiftCardDenomination {
  amountUsd: number;
  localAmount: number;
  localCurrency: string;
  points: number;
  label: string;
  localLabel: string;
}

export function getGiftCardOptions(isRegional: boolean): GiftCardDenomination[] {
  const tiers = [5, 10, 20];
  return tiers.map((usd) => {
    if (isRegional) {
      // Points convert to Naira (1 pt = 0.83 NGN), Naira converts to USD Gift Card ($1 = 1,500 NGN)
      const localNaira = usd * USD_TO_NAIRA_EXCHANGE_RATE;
      const pts = Math.round(localNaira / POINT_VALUE_NAIRA);
      return {
        amountUsd: usd,
        localAmount: localNaira,
        localCurrency: "NGN",
        points: pts,
        label: `$${usd} USD`,
        localLabel: formatNaira(localNaira),
      };
    } else {
      // International: 1 pt = $0.004 USD
      const pts = Math.round(usd / POINT_VALUE_USD);
      return {
        amountUsd: usd,
        localAmount: usd,
        localCurrency: "USD",
        points: pts,
        label: `$${usd} USD`,
        localLabel: formatUsd(usd),
      };
    }
  });
}

// Minimum withdrawal: 5,700 SyllaPoints for all students
export const MINIMUM_WITHDRAWAL_POINTS = 5700;
export const MINIMUM_WITHDRAWAL_NAIRA = pointsToNaira(MINIMUM_WITHDRAWAL_POINTS); // ₦4,731
export const MINIMUM_WITHDRAWAL_USD = pointsToUsd(MINIMUM_WITHDRAWAL_POINTS); // $22.80

// Weekend-only withdrawals enforcement (Saturdays and Sundays only)
export function isWeekendWithdrawalWindow(): boolean {
  const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

// Reward Milestones (Standard)
export const POINTS_REGISTRATION_BONUS = 200;
export const POINTS_INSTALL_APP_BONUS = 100;
export const POINTS_UPGRADE_BONUS = 300;
export const POINTS_PER_VERIFIED_UPLOAD = 25;
export const POINTS_PER_VIEW = 2;
export const POINTS_PER_DOWNLOAD = 5;
export const POINTS_PER_30_MIN_STUDY = 5;

// Helper to calculate earnings with 1.3x SyllaPlus multiplier
export function calculateReward(basePoints: number, isPlus: boolean): number {
  if (!isPlus) return basePoints;
  return Math.round(basePoints * SYLLAPLUS_EARNINGS_MULTIPLIER);
}

// Study Session Timing
export const STUDY_TIMER_INTERVAL_SECONDS = 30 * 60; // 30 minutes
export const STUDY_INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hour inactivity threshold

// Referral System
export const POINTS_REFERRAL_REGISTRATION = 40;
export const POINTS_REFERRAL_UPGRADE = 200;

export const LEVELS: string[] = [];
export const MATERIAL_TYPES = [
  "Lecture notes",
  "Past questions",
  "Textbook / handout",
  "Assignment / solution",
  "Summary",
  "Lab manual",
  "Other",
];
export const REFERRAL_SOURCES = [
  "Friend or classmate",
  "WhatsApp group",
  "Instagram",
  "TikTok",
  "X (Twitter)",
  "Facebook",
  "Google search",
  "Lecturer or school",
  "Other",
];
export const ACCEPTED_FILES = "application/pdf,image/png,image/jpeg,image/webp";
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

type Institution = { name: string; country: string; city?: string };
export const institutionOptions: SearchOption[] = (institutions as Institution[]).map((i) => ({
  label: i.name,
  meta: [i.city, i.country].filter(Boolean).join(", "),
}));
export const courseOptions: SearchOption[] = (courses as string[]).map((c) => ({ label: c }));
