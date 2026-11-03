import type { Lang } from "@/lib/i18n";

const locale = (lang: Lang) => (lang === "es" ? "es-ES" : "en-GB");
const TZ = "Europe/Madrid";

function toDate(v: string | number | Date | null | undefined): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Locale-aware formatters. Usage: const f = fmt(lang); f.hours(12.5) → "12,5 h". */
export function fmt(lang: Lang) {
  const loc = locale(lang);
  const num = new Intl.NumberFormat(loc);
  const num1 = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
  const eur = new Intl.NumberFormat(loc, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const eur2 = new Intl.NumberFormat(loc, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = new Intl.NumberFormat(loc, { style: "percent", maximumFractionDigits: 0 });
  const dt = new Intl.DateTimeFormat(loc, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const dShort = new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", timeZone: TZ });
  const dLong = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
  const time = new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: "auto" });

  return {
    number: (n: number) => num.format(n),
    decimal: (n: number) => num1.format(n),
    percent: (ratio: number) => pct.format(ratio),
    eur: (n: number) => eur.format(n),
    eur2: (n: number) => eur2.format(n),
    hours: (h: number) => `${num1.format(h)} h`,
    /** 7.5 → "7 h 30 min" */
    hm: (h: number) => {
      const total = Math.round(h * 60);
      const hh = Math.floor(total / 60);
      const mm = total % 60;
      return hh ? (mm ? `${hh} h ${mm} min` : `${hh} h`) : `${mm} min`;
    },
    duration: (sec: number) => {
      if (sec < 60) return `${Math.round(sec)} s`;
      const m = Math.floor(sec / 60);
      const s = Math.round(sec % 60);
      return m < 60 ? (s ? `${m} min ${s} s` : `${m} min`) : `${Math.floor(m / 60)} h ${m % 60} min`;
    },
    dateTime: (v: string | null | undefined) => {
      const d = toDate(v);
      return d ? dt.format(d) : "—";
    },
    date: (v: string | null | undefined) => {
      const d = toDate(v);
      return d ? dShort.format(d) : "—";
    },
    dateLong: (v: string | null | undefined) => {
      const d = toDate(v);
      return d ? dLong.format(d) : "—";
    },
    time: (v: string | null | undefined) => {
      const d = toDate(v);
      return d ? time.format(d) : "—";
    },
    relative: (v: string | null | undefined, now: Date = new Date()) => {
      const d = toDate(v);
      if (!d) return "—";
      const s = Math.round((d.getTime() - now.getTime()) / 1000);
      const a = Math.abs(s);
      if (a < 60) return rtf.format(s, "second");
      if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
      if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
      if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
      return dShort.format(d);
    },
  };
}

export type Formatter = ReturnType<typeof fmt>;
