import {
  type Schedule,
  type Rule,
  type DayExpression,
  type TimeExpression,
  type ExceptionClause,
  type ExceptionExpression,
  type TimeRange,
  DayOfWeek,
} from './types.js';
import {
  dayOfWeekFromDate,
  resolveOrdinalDay,
  expandDayRange,
  expandKeyword,
  rangeToMinutes,
  mergeIntervals,
  subtractIntervals,
  minuteOfDay,
  previousDay,
} from './utils.js';
import { parse } from './parser.js';

export function isActive(schedule: string | Schedule, datetime: Date): boolean {
  const sched = typeof schedule === 'string' ? parse(schedule) : schedule;
  return sched.rules.some((rule) => ruleIsActive(rule, datetime));
}

function ruleIsActive(rule: Rule, datetime: Date): boolean {
  const dow = dayOfWeekFromDate(datetime);
  const minute = minuteOfDay(datetime);
  const year = datetime.getFullYear();
  const month = datetime.getMonth();
  const dayOfMonth = datetime.getDate();

  // Get the active time intervals for today from this rule.
  // This includes both direct matches (today matches the day expression)
  // and overnight spillover (yesterday matched and a time range wraps past midnight).
  const intervals = getActiveIntervalsForDate(
    rule,
    year,
    month,
    dayOfMonth,
    dow,
  );

  return intervals.some(([s, e]) => minute >= s && minute < e);
}

function getActiveIntervalsForDate(
  rule: Rule,
  year: number,
  month: number,
  dayOfMonth: number,
  dow: DayOfWeek,
): [number, number][] {
  const allIntervals: [number, number][] = [];

  // Check if today directly matches the day expression
  if (dayMatchesExpression(rule.dayExpr, year, month, dayOfMonth, dow)) {
    if (!isDayExcepted(rule.exceptions, year, month, dayOfMonth, dow)) {
      const intervals = resolveTimeIntervals(rule.timeExpr);
      // Only take the non-overnight portions (start < end)
      for (const [s, e] of intervals) {
        if (s < e) {
          allIntervals.push([s, e]);
        } else {
          // Overnight range: take the today portion (start to midnight)
          allIntervals.push([s, 1440]);
        }
      }
    }
  }

  // Check if yesterday matched the day expression (for overnight spillover)
  const yesterday = new Date(year, month, dayOfMonth - 1);
  const yDow = dayOfWeekFromDate(yesterday);
  const yYear = yesterday.getFullYear();
  const yMonth = yesterday.getMonth();
  const yDom = yesterday.getDate();

  if (dayMatchesExpression(rule.dayExpr, yYear, yMonth, yDom, yDow)) {
    if (!isDayExcepted(rule.exceptions, yYear, yMonth, yDom, yDow)) {
      const intervals = resolveTimeIntervals(rule.timeExpr);
      // Only take overnight spillover portions (where start > end)
      for (const [s, e] of intervals) {
        if (s >= e && e > 0) {
          allIntervals.push([0, e]);
        }
      }
    }
  }

  // Apply time exceptions
  let merged = mergeIntervals(allIntervals);
  if (rule.exceptions) {
    const timeExceptions = getTimeExceptionIntervals(rule.exceptions);
    merged = subtractIntervals(merged, timeExceptions);
  }

  return merged;
}

function dayMatchesExpression(
  expr: DayExpression,
  year: number,
  month: number,
  dayOfMonth: number,
  dow: DayOfWeek,
): boolean {
  switch (expr.type) {
    case 'bare':
      return dow === expr.day;
    case 'list':
      return expr.days.includes(dow);
    case 'range': {
      const days = expandDayRange(expr.start, expr.end);
      return days.includes(dow);
    }
    case 'keyword': {
      const days = expandKeyword(expr.keyword);
      return days.includes(dow);
    }
    case 'ordinal': {
      const resolved = resolveOrdinalDay(year, month, expr.ordinal, expr.day);
      return resolved === dayOfMonth;
    }
  }
}

function isDayExcepted(
  exceptions: ExceptionClause | null,
  year: number,
  month: number,
  dayOfMonth: number,
  dow: DayOfWeek,
): boolean {
  if (!exceptions) return false;
  return exceptions.expressions.some((ex) =>
    dayExceptionMatches(ex, year, month, dayOfMonth, dow),
  );
}

function dayExceptionMatches(
  ex: ExceptionExpression,
  year: number,
  month: number,
  dayOfMonth: number,
  dow: DayOfWeek,
): boolean {
  switch (ex.type) {
    case 'bare':
      return dow === ex.day;
    case 'list':
      return ex.days.includes(dow);
    case 'range': {
      const days = expandDayRange(ex.start, ex.end);
      return days.includes(dow);
    }
    case 'ordinal': {
      const resolved = resolveOrdinalDay(year, month, ex.ordinal, ex.day);
      return resolved === dayOfMonth;
    }
    case 'time':
      return false; // time exceptions don't exclude days
  }
}

function resolveTimeIntervals(
  timeExpr: TimeExpression,
): [number, number][] {
  if (timeExpr.type === 'allday') {
    return [[0, 1440]];
  }
  return timeExpr.ranges.map(rangeToMinutes);
}

function getTimeExceptionIntervals(
  exceptions: ExceptionClause,
): [number, number][] {
  const intervals: [number, number][] = [];
  for (const ex of exceptions.expressions) {
    if (ex.type === 'time') {
      const [s, e] = rangeToMinutes(ex.range);
      if (s < e) {
        intervals.push([s, e]);
      } else {
        // Overnight time exception wraps
        intervals.push([s, 1440]);
        intervals.push([0, e]);
      }
    }
  }
  return mergeIntervals(intervals);
}

/**
 * Get the fully resolved active intervals for a specific date under a schedule.
 * Used by the scanner for efficient forward iteration.
 */
export function getScheduleIntervalsForDate(
  sched: Schedule,
  date: Date,
): [number, number][] {
  const dow = dayOfWeekFromDate(date);
  const year = date.getFullYear();
  const month = date.getMonth();
  const dayOfMonth = date.getDate();

  const all: [number, number][] = [];
  for (const rule of sched.rules) {
    const intervals = getActiveIntervalsForDate(
      rule,
      year,
      month,
      dayOfMonth,
      dow,
    );
    all.push(...intervals);
  }
  return mergeIntervals(all);
}
