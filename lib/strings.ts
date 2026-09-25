export const APP_NAME = "Gimnafica";

export const ROLE_LABELS = {
  PROFESOR: "Profesor",
  KUHINJA: "Kuhinja",
  ADMIN: "Admin",
} as const;

export const ORDER_STATUS_LABELS = {
  ACTIVE: "Poručeno",
  DONE: "Završeno",
  CANCELLED: "Otkazano",
} as const;

export function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
