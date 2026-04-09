import { DayOfWeek, Ordinal, TimeRange } from './types.js';

const JS_DAY_TO_SCHEDRON: Record<number, DayOfWeek> = {
  0: DayOfWeek.Sun,
  1: DayOfWeek.Mon,
  2: DayOfWeek.Tue,
  3: DayOfWeek.Wed,
  4: DayOfWeek.Thu,
  5: DayOfWeek.Fri,
  6: DayOfWeek.Sat,
};

export function dayOfWeekFromDate(date: Date): DayOfWeek {
  return JS_DAY_TO_SCHEDRON[date.getDay()];
}

export function nthWeekdayInMonth(
  year: number,
  month: number,
  weekday: DayOfWeek,
  n: number,
): number | null {
  // month is 0-based (JS convention)
  const first = new Date(year, month, 1);
  const firstDow = dayOfWeekFromDate(first);

  let offset = weekday - firstDow;
  if (offset < 0) offset += 7;

  const day = 1 + offset + (n - 1) * 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return day <= daysInMonth ? day : null;
}

export function lastWeekdayInMonth(
  year: number,
  month: number,
  weekday: DayOfWeek,
): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const last = new Date(year, month, daysInMonth);
  const lastDow = dayOfWeekFromDate(last);

  let offset = lastDow - weekday;
  if (offset < 0) offset += 7;

  return daysInMonth - offset;
}

export function resolveOrdinalDay(
  year: number,
  month: number,
  ordinal: Ordinal,
  day: DayOfWeek,
): number | null {
  if (ordinal === Ordinal.Last) {
    return lastWeekdayInMonth(year, month, day);
  }
  return nthWeekdayInMonth(year, month, day, ordinal);
}

export function expandDayRange(
  start: DayOfWeek,
  end: DayOfWeek,
): DayOfWeek[] {
  const days: DayOfWeek[] = [];
  let current = start;
  for (;;) {
    days.push(current);
    if (current === end) break;
    current = current === 7 ? 1 : ((current + 1) as DayOfWeek);
  }
  return days;
}

export function expandKeyword(
  keyword: 'daily' | 'weekdays' | 'weekends',
): DayOfWeek[] {
  switch (keyword) {
    case 'weekdays':
      return [
        DayOfWeek.Mon,
        DayOfWeek.Tue,
        DayOfWeek.Wed,
        DayOfWeek.Thu,
        DayOfWeek.Fri,
      ];
    case 'weekends':
      return [DayOfWeek.Sat, DayOfWeek.Sun];
    case 'daily':
      return [
        DayOfWeek.Mon,
        DayOfWeek.Tue,
        DayOfWeek.Wed,
        DayOfWeek.Thu,
        DayOfWeek.Fri,
        DayOfWeek.Sat,
        DayOfWeek.Sun,
      ];
  }
}

export function timeToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function rangeToMinutes(r: TimeRange): [number, number] {
  return [
    timeToMinutes(r.startHour, r.startMinute),
    timeToMinutes(r.endHour, r.endMinute),
  ];
}

export function mergeIntervals(
  intervals: [number, number][],
): [number, number][] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

export function subtractIntervals(
  base: [number, number][],
  subtract: [number, number][],
): [number, number][] {
  let result = [...base];
  for (const sub of subtract) {
    const next: [number, number][] = [];
    for (const [s, e] of result) {
      if (sub[1] <= s || sub[0] >= e) {
        next.push([s, e]);
      } else {
        if (s < sub[0]) next.push([s, sub[0]]);
        if (sub[1] < e) next.push([sub[1], e]);
      }
    }
    result = next;
  }
  return result;
}

export function previousDay(day: DayOfWeek): DayOfWeek {
  return day === 1 ? 7 : ((day - 1) as DayOfWeek);
}

export function addDays(date: Date, n: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}
