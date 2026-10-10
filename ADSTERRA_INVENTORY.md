# Adsterra Ads Inventory & Complete Removal Guide
**Domain**: `syllaboss.org`  
**Date Created**: October 10, 2026  
**Status**: Active  

This document tracks all Adsterra ad placements, configuration keys, integration files, and quick instructions for cleanly removing all ad code when requested.

---

## 1. Adsterra Ad Units & Keys

| Format | Dimensions | Adsterra Key / Script | Placement / Location |
| :--- | :--- | :--- | :--- |
| **Leaderboard** | `728x90` | `b3720c8d5e2995c13dd1de1ef899c05e` | Landing page (top & bottom), Dashboard top nav, Library, Document Preview |
| **Mobile Banner** | `320x50` | `da543edd9cb099b70bf8f4edfed574d2` | Landing page mobile header, Dashboard mobile header, Preview mobile header |
| **Medium Rectangle** | `300x250` | `b851135b4c012d24bb206c404ba92527` | Landing page (mid-fold above downloads), Library mobile in-feed |
| **Half Page / Skyscraper** | `160x600` | `e9b2518fc274bc7ae8a9fdf7404c1973` | Configured in `src/components/adsterra.tsx` |
| **Wide Skyscraper** | `160x300` | `3fdc378a8547e530080718c05a19ade2` | Configured in `src/components/adsterra.tsx` |
| **Full Banner** | `468x60` | `4fda5fa08d0629267a970c5587adcdb7` | Configured in `src/components/adsterra.tsx` |
| **Native Banner** | 4-Image Grid | Script: `https://pl31765394.profitableratecpmnetwork.com/03d2b5583243eacd225e5c89c3ff554c/invoke.js`<br>Container: `container-03d2b5583243eacd225e5c89c3ff554c` | Landing page (above FAQ section) |
| **Popunder** | Full Page | Script: `https://pl31765393.profitableratecpmnetwork.com/42/91/76/429176159e717cb765d70bc7a6385d24.js` | Global (`src/routes/__root.tsx`) |
| **SocialBar** | Sticky Widget | Script: `https://pl31765395.profitableratecpmnetwork.com/89/f0/b6/89f0b61bb99a240e575724b1c748ae33.js` | Global (`src/routes/__root.tsx`) |
| **Smartlink** | Direct URL | `https://www.profitableratecpmnetwork.com/f75mdf5t?key=54987c8d6ece5e4ab0650e2f8a746b5d` | Configured in `src/components/adsterra.tsx` |

---

## 2. Integrated Codebase Locations

### A. Core Component & Configurations
- **File**: [`src/components/adsterra.tsx`](file:///src/components/adsterra.tsx)
  - Contains `ADSTERRA_CONFIG` object with all ad keys and script sources.
  - Exports `<AdsterraBanner />` (isolated iframe rendering for responsive banner formats).
  - Exports `<AdsterraNativeBanner />` (native sponsored content recommendations).
  - Exports `<AdsterraAutoClicker />` (auto-focuses/clicks the nearest ad in viewport and attaches one-time pointerdown listener for popunders).

### B. Global Root Shell
- **File**: [`src/routes/__root.tsx`](file:///src/routes/__root.tsx)
  - Loads Adsterra Popunder script: `https://pl31765393.profitableratecpmnetwork.com/42/91/76/429176159e717cb765d70bc7a6385d24.js`
  - Loads Adsterra SocialBar script: `https://pl31765395.profitableratecpmnetwork.com/89/f0/b6/89f0b61bb99a240e575724b1c748ae33.js`

### C. Landing Page
- **File**: [`src/routes/index.tsx`](file:///src/routes/index.tsx)
  - `<AdsterraAutoClicker />` at top of page.
  - Top Leaderboard (`728x90` desktop / `320x50` mobile) above top nav.
  - Mid-page `300x250` Banner placed above downloads section.
  - Native Recommendation Grid (`AdsterraNativeBanner`) placed above FAQ section.
  - Bottom Leaderboard (`728x90` desktop / `320x50` mobile) placed above footer.

### D. Authenticated Student Dashboard Shell
- **File**: [`src/components/app-shell.tsx`](file:///src/components/app-shell.tsx)
  - `<AdsterraAutoClicker />` active on entry.
  - Top header sponsored leaderboard (`728x90` desktop / `320x50` mobile) displayed between search bar and streak pill.

### E. University Library
- **File**: [`src/routes/_authenticated/dashboard.library.tsx`](file:///src/routes/_authenticated/dashboard.library.tsx)
  - In-feed sponsored banner (`728x90` desktop / `300x250` mobile) placed directly between search/filter console and course materials grid.

### F. Document Preview & Reader
- **File**: [`src/routes/_authenticated/dashboard.preview.tsx`](file:///src/routes/_authenticated/dashboard.preview.tsx)
  - Sponsored reader banner (`728x90` desktop / `320x50` mobile) placed directly below top document metadata bar.

---

## 3. How to Completely Remove All Ads Later (One-Step Removal Checklist)

To remove every Adsterra ad and restore a clean ad-free experience, follow these steps:

1. **Delete `src/components/adsterra.tsx`**:
   ```bash
   git rm src/components/adsterra.tsx
   ```

2. **In `src/routes/__root.tsx`**:
   Remove the two Adsterra script tags in `<head>`:
   ```tsx
   {/* Adsterra Global Popunder */}
   <script src="https://pl31765393.profitableratecpmnetwork.com/42/91/76/429176159e717cb765d70bc7a6385d24.js" />
   {/* Adsterra Global SocialBar */}
   <script src="https://pl31765395.profitableratecpmnetwork.com/89/f0/b6/89f0b61bb99a240e575724b1c748ae33.js" />
   ```

3. **In `src/routes/index.tsx`**:
   - Remove import: `import { AdsterraBanner, AdsterraNativeBanner, AdsterraAutoClicker } from "@/components/adsterra";`
   - Remove `<AdsterraAutoClicker />` and the `<AdsterraBanner />` / `<AdsterraNativeBanner />` elements.

4. **In `src/components/app-shell.tsx`**:
   - Remove import: `import { AdsterraBanner, AdsterraAutoClicker } from "./adsterra";`
   - Remove `<AdsterraAutoClicker />` and `<AdsterraBanner ... />` inside header.

5. **In `src/routes/_authenticated/dashboard.library.tsx`**:
   - Remove import: `import { AdsterraBanner } from "@/components/adsterra";`
   - Remove `<AdsterraBanner ... />` strip above the repository grid.

6. **In `src/routes/_authenticated/dashboard.preview.tsx`**:
   - Remove import: `import { AdsterraBanner } from "@/components/adsterra";`
   - Remove `<AdsterraBanner ... />` strip above the split container.
