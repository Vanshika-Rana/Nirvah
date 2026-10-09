import { describe, expect, it } from "vitest";
import {
  addMonths,
  endOfWeek,
  monthRange,
  parseISODate,
  startOfWeek,
  toISODate,
  toYearMonth,
  weekRange,
} from "@/lib/finance/dates";

describe("month boundaries", () => {
  it("uses the first and last calendar day of the month", () => {
    expect(monthRange("2026-10")).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthRange("2024-02")).toEqual({ start: "2024-02-01", end: "2024-02-29" });
  });

  it("does not shift months across UTC", () => {
    const date = parseISODate("2026-10-01");
    expect(toYearMonth(date)).toBe("2026-10");
    expect(toISODate(date)).toBe("2026-10-01");
  });

  it("moves to adjacent months without rewriting the source", () => {
    expect(addMonths("2026-10", 1)).toBe("2026-11");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
});

describe("weekly totals use Monday through Sunday by default", () => {
  it("starts weeks on Monday", () => {
    const friday = parseISODate("2026-10-09");
    expect(toISODate(startOfWeek(friday, 1))).toBe("2026-10-05");
    expect(toISODate(endOfWeek(friday, 1))).toBe("2026-10-11");
    expect(weekRange("2026-10-05", 1)).toEqual({
      start: "2026-10-05",
      end: "2026-10-11",
    });
  });

  it("keeps Sunday in the same week as the preceding Monday", () => {
    expect(weekRange("2026-10-11", 1)).toEqual({
      start: "2026-10-05",
      end: "2026-10-11",
    });
  });

  it("does not reset dates; a Monday is just a new range", () => {
    const previous = weekRange("2026-10-04", 1);
    const next = weekRange("2026-10-05", 1);
    expect(previous.end).toBe("2026-10-04");
    expect(next.start).toBe("2026-10-05");
  });
});
