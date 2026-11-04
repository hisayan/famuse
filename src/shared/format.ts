/**
 * Format helpers shared by server and browser code. All output is English.
 */

/** "just now", "45m ago", "3h ago", "2d ago" for a past timestamp. */
export function formatElapsedShort(epochMs: number, nowMs: number = Date.now()): string {
  const diffMs = Math.max(0, nowMs - epochMs);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** "6:20 PM" style clock time. Pass "UTC" on the server for determinism. */
export function formatClockTime(epochMs: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(epochMs));
}
