import { describe, expect, it } from "vitest";
import { COFFEES, dayKey, formatDayLabel, formatDuration, formatTime, plural } from "./strings";

describe("plural", () => {
  it.each([
    [1, "kafa"], [2, "kafe"], [4, "kafe"], [5, "kafa"], [11, "kafa"],
    [12, "kafa"], [14, "kafa"], [21, "kafa"], [22, "kafe"], [0, "kafa"],
  ])("%i %s", (n, word) => expect(plural(n, COFFEES)).toBe(word));
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(8 * 60_000)).toBe("8 min");
    expect(formatDuration(60 * 60_000)).toBe("1 h");
    expect(formatDuration(95 * 60_000)).toBe("1 h 35 min");
  });
});

describe("Serbian time zone", () => {
  // 22:30 UTC in summer is 00:30 the next day in Belgrade.
  const lateUtc = new Date("2026-09-24T22:30:00Z");

  it("formats times in Europe/Belgrade regardless of server zone", () => {
    expect(formatTime(lateUtc)).toBe("00:30");
  });

  it("uses the Belgrade calendar day", () => {
    expect(dayKey(lateUtc)).toBe("2026-09-25");
  });

  it("labels today and yesterday", () => {
    const now = new Date("2026-09-25T10:00:00Z");
    expect(formatDayLabel(lateUtc, now)).toBe("Danas");
    expect(formatDayLabel(new Date("2026-09-24T10:00:00Z"), now)).toBe("Juče");
    expect(formatDayLabel(new Date("2026-09-22T10:00:00Z"), now)).toMatch(/^Utorak, 22\. septembar/);
  });
});
