/** Times are unix seconds (as the contract stores them) and shown in UTC, the market's own clock. */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

/** "Sat 25 Oct, 18:00 UTC" */
export function formatUtc(seconds: number): string {
  const d = new Date(seconds * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${hh}:${mm} UTC`;
}

/** "2025-10-25" for compared rows */
export function formatIsoDate(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

/** A duration as "2 d 4 h", "3 h 12 m", "8 m", "under a minute" */
export function formatSpan(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return m > 0 ? `${h} h ${m} m` : `${h} h`;
  if (m > 0) return `${m} m`;
  return "under a minute";
}

/** "in 2 d 4 h" / "2 d 4 h ago" */
export function relative(seconds: number, now = nowSeconds()): string {
  const diff = seconds - now;
  return diff >= 0 ? `in ${formatSpan(diff)}` : `${formatSpan(-diff)} ago`;
}
