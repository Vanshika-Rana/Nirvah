import { describe, expect, it } from "vitest";
import {
  addMonths,
  adjacentPaydayWeek,
  endOfWeek,
  firstSalaryDate,
  monthRange,
  parseISODate,
  paydayWeekContaining,
  paydayWeeks,
  startOfWeek,
  toISODate,
  toYearMonth,
  weekRange,
} from "@/lib/finance/dates";
import { weekTarget } from "@/lib/finance/weekly";

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

describe("payday weeks start on the salary date and clip at month-end", () => {
  it("builds 7-day weeks from a Friday payday", () => {
    expect(paydayWeeks("2026-10-09", "2026-10-31")).toEqual([
      { start: "2026-10-09", end: "2026-10-15" },
      { start: "2026-10-16", end: "2026-10-22" },
      { start: "2026-10-23", end: "2026-10-29" },
      { start: "2026-10-30", end: "2026-10-31" },
    ]);
  });

  it("finds the week that contains a given day", () => {
    expect(paydayWeekContaining("2026-10-09", "2026-10-09", "2026-10-31")).toEqual({
      start: "2026-10-09",
      end: "2026-10-15",
    });
    expect(paydayWeekContaining("2026-10-31", "2026-10-09", "2026-10-31")).toEqual({
      start: "2026-10-30",
      end: "2026-10-31",
    });
    expect(paydayWeekContaining("2026-10-08", "2026-10-09", "2026-10-31")).toBeNull();
  });

  it("uses the earliest salary date as day one", () => {
    expect(
      firstSalaryDate([
        { is_salary: false, occurred_on: "2026-10-01" },
        { is_salary: true, occurred_on: "2026-10-12" },
        { is_salary: true, occurred_on: "2026-10-09" },
      ]),
    ).toBe("2026-10-09");
  });

  it("steps back to the previous month's last clipped week", () => {
    const previous = adjacentPaydayWeek({ start: "2026-10-09", end: "2026-10-15" }, -1, (month) =>
      month === "2026-10" ? "2026-10-09" : month === "2026-09" ? "2026-09-11" : null,
    );
    expect(previous).toEqual({ start: "2026-09-25", end: "2026-09-30" });
  });
});

describe("short last weeks use a smaller target", () => {
  it("keeps a full target for seven days and scales two-day leftovers", () => {
    expect(weekTarget(7000, "2026-10-09", "2026-10-15")).toBe(7000);
    expect(weekTarget(7000, "2026-10-30", "2026-10-31")).toBe(2000);
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
