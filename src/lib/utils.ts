import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Build an href that preserves the agent filter (and other given params) across pages. */
export function withParams(path: string, params: Record<string, string | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && v !== "all") qs.set(k, v);
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

export function orgPath(org: string, ...parts: string[]): string {
  return ["/o", encodeURIComponent(org), ...parts.map(encodeURIComponent)].join("/");
}

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
