import { useState, useEffect } from "react";
import { REGIONAL_COUNTRIES } from "./constants";

export interface GeoLocation {
  countryCode: string;
  countryName: string;
  ip: string;
  timezone: string;
  isRegional: boolean;
  isVpnOrProxy: boolean;
  vpnReason?: string;
  checkedAt: number;
}

const REGIONAL_COUNTRY_CODES = new Set([
  // Africa
  "NG", "GH", "KE", "ZA", "EG", "RW", "UG", "TZ", "ET", "CM", "SN", "CI", "MA", "DZ", "TN",
  // South Asia
  "IN", "PK", "NP"
]);

const CACHE_KEY = "syllaboss_geo_telemetry_v1";
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

// Detect WebRTC or Timezone discrepancies common in VPN connections
function detectTimezoneAnomaly(ipTimezone?: string): boolean {
  if (!ipTimezone) return false;
  try {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTimezone) return false;

    // Check if timezone prefix (continent) drastically differs e.g. IP in Africa/Lagos but browser is America/New_York
    const browserContinent = browserTimezone.split("/")[0];
    const ipContinent = ipTimezone.split("/")[0];

    if (browserContinent && ipContinent && browserContinent !== ipContinent) {
      // Allow UTC edge-cases, but flag drastic continent jumps
      if (browserContinent !== "Etc" && ipContinent !== "Etc") {
        return true;
      }
    }
  } catch {
    // Ignore timezone parse errors
  }
  return false;
}

export async function detectUserGeo(): Promise<GeoLocation> {
  // Check sessionStorage cache first
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as GeoLocation;
        if (Date.now() - parsed.checkedAt < CACHE_TTL_MS) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  let countryCode = "NG";
  let countryName = "Nigeria";
  let ip = "127.0.0.1";
  let timezone = "Africa/Lagos";
  let isVpnOrProxy = false;
  let vpnReason = "";

  try {
    // Primary High-Accuracy Threat & Geo Check: ip-api with proxy and hosting flags
    const res1 = await fetch(
      "https://ip-api.com/json/?fields=status,message,country,countryCode,timezone,isp,org,as,proxy,hosting,query",
      { signal: AbortSignal.timeout(4000) }
    );

    if (res1.ok) {
      const d1 = await res1.json();
      if (d1.status === "success") {
        countryCode = d1.countryCode?.toUpperCase() || "NG";
        countryName = d1.country || "Nigeria";
        ip = d1.query || "";
        timezone = d1.timezone || "";

        // Check if identified as proxy or commercial datacenter/hosting range (VPN)
        if (d1.proxy === true) {
          isVpnOrProxy = true;
          vpnReason = "Commercial Proxy Connection";
        } else if (d1.hosting === true) {
          isVpnOrProxy = true;
          vpnReason = "Datacenter / VPN Network Range";
        }
      }
    }
  } catch {
    // Secondary fallback: freeipapi
    try {
      const res2 = await fetch("https://freeipapi.com/api/json", { signal: AbortSignal.timeout(3500) });
      if (res2.ok) {
        const d2 = await res2.json();
        countryCode = d2.countryCode?.toUpperCase() || countryCode;
        countryName = d2.countryName || countryName;
        ip = d2.ipAddress || ip;
        if (d2.timeZones?.[0]) timezone = d2.timeZones[0];
        if (d2.isProxy === true) {
          isVpnOrProxy = true;
          vpnReason = "Proxy Tunnel Detected";
        }
      }
    } catch {
      // Ignore fallback errors
    }
  }

  // Cross-verify timezone anomaly
  if (!isVpnOrProxy && timezone) {
    if (detectTimezoneAnomaly(timezone)) {
      isVpnOrProxy = true;
      vpnReason = "Browser and Network Timezone Discrepancy (VPN Tunnel)";
    }
  }

  const isRegional =
    REGIONAL_COUNTRY_CODES.has(countryCode) ||
    REGIONAL_COUNTRIES.some((c) => c.toLowerCase() === countryName.toLowerCase());

  const geoData: GeoLocation = {
    countryCode,
    countryName,
    ip,
    timezone,
    isRegional,
    isVpnOrProxy,
    vpnReason: isVpnOrProxy ? vpnReason : undefined,
    checkedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(geoData));
    } catch {
      // Ignore cache failure
    }
  }

  return geoData;
}

// React Hook for automatic location awareness
export function useGeo() {
  const [geo, setGeo] = useState<GeoLocation>(() => {
    // Immediate fallback default based on regional bias while resolving
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {
        // Ignore storage errors
      }
    }
    return {
      countryCode: "NG",
      countryName: "Nigeria",
      ip: "",
      timezone: "Africa/Lagos",
      isRegional: true,
      isVpnOrProxy: false,
      checkedAt: 0,
    };
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    detectUserGeo()
      .then((data) => {
        if (active) {
          setGeo(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    geo,
    isLoading,
    isRegional: geo.isRegional,
    isVpnOrProxy: geo.isVpnOrProxy,
    vpnReason: geo.vpnReason,
    countryCode: geo.countryCode,
    countryName: geo.countryName,
    currency: geo.isRegional ? "NGN" : "USD",
    currencySymbol: geo.isRegional ? "₦" : "$",
  };
}
