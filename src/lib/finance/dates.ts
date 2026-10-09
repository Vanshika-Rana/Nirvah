export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error("Invalid calendar date.");
  }
  return date;
}

export function isISODate(value: string): boolean {
  try {
    parseISODate(value);
    return true;
  } catch {
    return false;
  }
}

export function todayISO(now: Date): string {
  return toISODate(now);
}

export function toYearMonth(date: Date | string): string {
  const d = typeof date === "string" ? parseISODate(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function parseYearMonth(yearMonth: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) {
    throw new Error("Invalid month. Use YYYY-MM.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error("Invalid month.");
  }
  return { year, month };
}

export function monthRange(yearMonth: string): { start: string; end: string } {
  const { year, month } = parseYearMonth(yearMonth);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function addMonths(yearMonth: string, delta: number): string {
  const { year, month } = parseYearMonth(yearMonth);
  const date = new Date(year, month - 1 + delta, 1);
  return toYearMonth(date);
}

export function startOfWeek(date: Date | string, weekStartsOn: WeekStartDay = 1): Date {
  const d = typeof date === "string" ? parseISODate(date) : new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function endOfWeek(date: Date | string, weekStartsOn: WeekStartDay = 1): Date {
  const start = startOfWeek(date, weekStartsOn);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function weekRange(
  date: Date | string,
  weekStartsOn: WeekStartDay = 1,
): { start: string; end: string } {
  return {
    start: toISODate(startOfWeek(date, weekStartsOn)),
    end: toISODate(endOfWeek(date, weekStartsOn)),
  };
}

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === "string" ? parseISODate(date) : new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  d.setDate(d.getDate() + days);
  return d;
}

export function diffDays(from: Date | string, to: Date | string): number {
  const a = typeof from === "string" ? parseISODate(from) : from;
  const b = typeof to === "string" ? parseISODate(to) : to;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

export function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  let current = parseISODate(start);
  const last = parseISODate(end);
  while (current <= last) {
    days.push(toISODate(current));
    current = addDays(current, 1);
  }
  return days;
}

export function formatMonthLabel(yearMonth: string): string {
  const { year, month } = parseYearMonth(yearMonth);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function formatDayLabel(isoDate: string): string {
  return parseISODate(isoDate).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatWeekRangeLabel(start: string, end: string): string {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  const startText = startDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const endText = endDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startText} – ${endText}`;
}

export function minISODate(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxISODate(a: string, b: string): string {
  return a >= b ? a : b;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstSalaryDate(
  incomes: { is_salary?: boolean; occurred_on: string }[],
): string | null {
  const dates = salaryDates(incomes);
  return dates[0] ?? null;
}

export function salaryDates(incomes: { is_salary?: boolean; occurred_on: string }[]): string[] {
  return [...new Set(incomes.filter((row) => row.is_salary).map((row) => row.occurred_on))].sort();
}

export type PayCycle = {
  start: string;
  end: string | null;
};

export function payCycleForDate(dates: string[], date: string): PayCycle | null {
  const sorted = [...new Set(dates)].sort();
  const latest = [...sorted].filter((value) => value <= date).at(-1) ?? null;
  if (!latest) return null;
  const startMonth = toYearMonth(latest);
  const start = sorted.find((value) => toYearMonth(value) === startMonth) ?? latest;
  const next = sorted.find((value) => toYearMonth(value) > startMonth) ?? null;
  return { start, end: next ? toISODate(addDays(next, -1)) : null };
}

export function cycleHorizon(cycle: PayCycle, today: string): string {
  if (cycle.end) return cycle.end;
  const elapsed = Math.max(0, diffDays(cycle.start, today));
  const weekIndex = Math.floor(elapsed / 7);
  return toISODate(addDays(cycle.start, weekIndex * 7 + 6));
}

export function paydayWeeks(
  cycleStart: string,
  lastDay: string,
): { start: string; end: string }[] {
  if (cycleStart > lastDay) return [];
  const weeks: { start: string; end: string }[] = [];
  let start = cycleStart;
  while (start <= lastDay) {
    const end = minISODate(toISODate(addDays(start, 6)), lastDay);
    weeks.push({ start, end });
    start = toISODate(addDays(end, 1));
  }
  return weeks;
}

export function paydayWeekContaining(
  date: string,
  cycleStart: string,
  lastDay: string,
): { start: string; end: string } | null {
  if (date < cycleStart || date > lastDay) return null;
  return paydayWeeks(cycleStart, lastDay).find((week) => date >= week.start && date <= week.end) ?? null;
}

export function adjacentPaydayWeek(
  current: { start: string; end: string },
  direction: -1 | 1,
  cycle: PayCycle,
): { start: string; end: string } | null {
  if (direction === -1) {
    if (current.start <= cycle.start) return null;
    const start = toISODate(addDays(current.start, -7));
    const rawEnd = toISODate(addDays(start, 6));
    return { start, end: cycle.end ? minISODate(rawEnd, cycle.end) : rawEnd };
  }
  const start = toISODate(addDays(current.end, 1));
  if (cycle.end && start > cycle.end) return null;
  const rawEnd = toISODate(addDays(start, 6));
  return { start, end: cycle.end ? minISODate(rawEnd, cycle.end) : rawEnd };
}
