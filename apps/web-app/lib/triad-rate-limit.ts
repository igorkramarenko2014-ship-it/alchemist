import {
  checkTriadRateLimitCore,
  __resetTriadRateLimitCoreForTests,
  fingerprintPromptNormalized,
  type TriadRateLimitCoreResult,
} from "@alchemist/shared-engine";

export function triadPromptFingerprintForRateLimit(prompt: string): string {
  return fingerprintPromptNormalized(prompt.toLowerCase().trim());
}

function clientKey(request: Request): string {
  const h = request.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export type TriadRateLimitResult = TriadRateLimitCoreResult;

export function __resetTriadRateLimitForTests(): void {
  __resetTriadRateLimitCoreForTests();
}

export function checkTriadRateLimit(request: Request, promptNormalized: string): TriadRateLimitResult {
  const disabled = process.env.ALCHEMIST_TRIAD_RATE_LIMIT_DISABLED === "1";
  const fp = triadPromptFingerprintForRateLimit(promptNormalized);
  return checkTriadRateLimitCore(clientKey(request), fp, Date.now(), { disabled });
}
