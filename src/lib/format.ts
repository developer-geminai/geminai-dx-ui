import type { Timestamp } from "./types";

export function toDate(value: Timestamp): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });

export function formatDateTime(value: Timestamp): string {
  const d = toDate(value);
  return d ? dateTime.format(d) : "—";
}

export function formatDay(d: Date): string {
  return dateOnly.format(d);
}

export function relativeTime(value: Timestamp, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return "—";
  const seconds = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return formatDateTime(value);
}

export function percent(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export const number = new Intl.NumberFormat("en-GB");
