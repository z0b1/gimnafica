export const APP_NAME = "Gimnafica";

// Always format in Serbian time: the server (e.g. Vercel) runs in UTC.
export const TIME_ZONE = "Europe/Belgrade";

export const ROLE_LABELS = {
  PROFESOR: "Profesor",
  KUHINJA: "Kuhinja",
  ADMIN: "Admin",
} as const;

export const ORDER_STATUS_LABELS = {
  ACTIVE: "Poslato kuhinji",
  DONE: "Pripremljeno",
  CANCELLED: "Otkazano",
} as const;

const timeFormat = new Intl.DateTimeFormat("sr-Latn-RS", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const dateTimeFormat = new Intl.DateTimeFormat("sr-Latn-RS", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat("sr-Latn-RS", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const formatTime = (date: Date | string) => timeFormat.format(new Date(date));
export const formatDateTime = (date: Date | string) => dateTimeFormat.format(new Date(date));

/** Calendar day in Serbian time, as "YYYY-MM-DD". */
export const dayKey = (date: Date | string) => dayKeyFormat.format(new Date(date));

/** "Danas", "Juče", or e.g. "sreda, 24. septembar". */
export function formatDayLabel(date: Date | string, now = new Date()) {
  const key = dayKey(date);
  if (key === dayKey(now)) return "Danas";
  if (key === dayKey(new Date(now.getTime() - 86_400_000))) return "Juče";
  const label = dayFormat.format(new Date(date));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "8 min", "1 h 35 min". */
export function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Serbian plural: plural(3, ["kafa", "kafe", "kafa"]) → "kafe". */
export function plural(n: number, [one, few, many]: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const COFFEES: [string, string, string] = ["kafa", "kafe", "kafa"];
export const ORDERS: [string, string, string] = ["porudžbina", "porudžbine", "porudžbina"];
export const ROUNDS: [string, string, string] = ["runda", "runde", "rundi"];

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

const dateFormat = new Intl.DateTimeFormat("sr-Latn-RS", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "numeric",
  year: "numeric",
});
export const formatDate = (date: Date | string) => dateFormat.format(new Date(date));
