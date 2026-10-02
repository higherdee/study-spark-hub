import courses from "@/data/courses.json";
import institutions from "@/data/institutions.json";
import type { SearchOption } from "@/components/search-select";

export const POINTS_NAME = "SyllaPoints";
export const PLAN_NAME = "SyllaPlus";

// SyllaPlus 1.3x Earning Multiplier
export const SYLLAPLUS_EARNINGS_MULTIPLIER = 1.3;
export const SYLLAPLUS_PRICE_NAIRA = 1500;
export const PAYSTACK_PUBLIC_KEY =
  (import.meta.env['VITE_PAYSTACK_PUBLIC_KEY'] as string | undefined) ||
  "pk_test_dce9deb490b95d717f302454b656a2450d83da4d";

// Economics: 1 Naira = 5 SyllaPoints
export const POINTS_PER_NAIRA = 5;
export const pointsToNaira = (points: number) => Math.floor(points / POINTS_PER_NAIRA);
export const nairaToPoints = (naira: number) => Math.floor(naira * POINTS_PER_NAIRA);

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

// Minimum withdrawal: 17,500 SyllaPoints = ₦3,500
export const MINIMUM_WITHDRAWAL_POINTS = 17500;
export const MINIMUM_WITHDRAWAL_NAIRA = pointsToNaira(MINIMUM_WITHDRAWAL_POINTS);

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

export const LEVELS = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "600 Level", "Postgraduate"];
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
