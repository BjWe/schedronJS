import { type Schedule } from './types.js';
import { parse } from './parser.js';
import { isActive, getScheduleIntervalsForDate } from './evaluator.js';
import { addDays, startOfDay } from './utils.js';

const MAX_SCAN_DAYS = 400; // ~13 months, covers ordinal edge cases

/**
 * Find the next datetime at or after `from` when the schedule becomes active.
 * Returns null if no activation is found within the scan window.
 */
export function nextActivation(
  schedule: string | Schedule,
  from: Date,
): Date | null {
  const sched = typeof schedule === 'string' ? parse(schedule) : schedule;
  if (sched.rules.length === 0) return null;

  const fromMinute = from.getHours() * 60 + from.getMinutes();
  let day = startOfDay(from);

  for (let d = 0; d < MAX_SCAN_DAYS; d++) {
    const intervals = getScheduleIntervalsForDate(sched, day);
    const dayStart = d === 0 ? fromMinute : 0;

    for (const [s, e] of intervals) {
      if (e <= dayStart) continue;
      const activationMinute = Math.max(s, dayStart);
      const result = new Date(day);
      result.setHours(
        Math.floor(activationMinute / 60),
        activationMinute % 60,
        0,
        0,
      );
      if (d === 0 && activationMinute === fromMinute) {
        if (isActive(sched, result)) return result;
        continue;
      }
      return result;
    }

    day = addDays(day, 1);
  }

  return null;
}

/**
 * Find the next datetime at or after `from` when the schedule becomes inactive.
 * Returns null if not currently active or no deactivation found.
 */
export function nextDeactivation(
  schedule: string | Schedule,
  from: Date,
): Date | null {
  const sched = typeof schedule === 'string' ? parse(schedule) : schedule;
  if (sched.rules.length === 0) return null;
  if (!isActive(sched, from)) return null;

  let currentMinute = from.getHours() * 60 + from.getMinutes();
  let day = startOfDay(from);

  for (let d = 0; d < MAX_SCAN_DAYS; d++) {
    const intervals = getScheduleIntervalsForDate(sched, day);

    // Find the interval that contains currentMinute
    let foundEnd: number | null = null;
    for (const [s, e] of intervals) {
      if (currentMinute >= s && currentMinute < e) {
        foundEnd = e;
        break;
      }
    }

    if (foundEnd !== null && foundEnd < 1440) {
      // The current active interval ends before midnight
      const result = new Date(day);
      result.setHours(Math.floor(foundEnd / 60), foundEnd % 60, 0, 0);
      return result;
    }

    if (foundEnd !== null && foundEnd >= 1440) {
      // Active until end of day — check if still active at start of next day
      day = addDays(day, 1);
      currentMinute = 0;
      d++;

      // Check if next day's 00:00 is active
      const nextDayStart = new Date(day);
      nextDayStart.setHours(0, 0, 0, 0);
      if (!isActive(sched, nextDayStart)) {
        return nextDayStart;
      }
      // Continue scanning from start of next day
      continue;
    }

    // If we didn't find an interval containing currentMinute on a day after the first,
    // the schedule just became inactive
    if (d > 0 && foundEnd === null) {
      const result = new Date(day);
      result.setHours(
        Math.floor(currentMinute / 60),
        currentMinute % 60,
        0,
        0,
      );
      return result;
    }

    // Shouldn't reach here on d=0 since we verified isActive(from)
    day = addDays(day, 1);
    currentMinute = 0;
  }

  return null;
}
