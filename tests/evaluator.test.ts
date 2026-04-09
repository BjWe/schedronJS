import { describe, it, expect } from 'vitest';
import { isActive } from '../src/evaluator.js';

// Helper: create a date with specific day-of-week
// 2026-04-06 is a Monday
function date(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// 2026-04 calendar:
// Mon Tue Wed Thu Fri Sat Sun
//               1   2   3   4   5
//   6   7   8   9  10  11  12
//  13  14  15  16  17  18  19
//  20  21  22  23  24  25  26
//  27  28  29  30

describe('isActive', () => {
  describe('basic day matching', () => {
    it('matches bare day', () => {
      expect(isActive('mon 09:00-17:00', date(2026, 4, 6, 10, 0))).toBe(true);
      expect(isActive('mon 09:00-17:00', date(2026, 4, 7, 10, 0))).toBe(false);
    });

    it('matches day range', () => {
      expect(isActive('mon-fri 09:00-17:00', date(2026, 4, 8, 10, 0))).toBe(true); // Wed
      expect(isActive('mon-fri 09:00-17:00', date(2026, 4, 11, 10, 0))).toBe(false); // Sat
    });

    it('matches wrapping day range', () => {
      expect(isActive('fri-mon 09:00-17:00', date(2026, 4, 11, 10, 0))).toBe(true); // Sat
      expect(isActive('fri-mon 09:00-17:00', date(2026, 4, 8, 10, 0))).toBe(false); // Wed
    });

    it('matches day list', () => {
      expect(isActive('mon,wed,fri 09:00-17:00', date(2026, 4, 8, 10, 0))).toBe(true); // Wed
      expect(isActive('mon,wed,fri 09:00-17:00', date(2026, 4, 7, 10, 0))).toBe(false); // Tue
    });

    it('matches weekdays keyword', () => {
      expect(isActive('weekdays 09:00-17:00', date(2026, 4, 6, 10, 0))).toBe(true); // Mon
      expect(isActive('weekdays 09:00-17:00', date(2026, 4, 11, 10, 0))).toBe(false); // Sat
    });

    it('matches weekends keyword', () => {
      expect(isActive('weekends 10:00-14:00', date(2026, 4, 11, 12, 0))).toBe(true); // Sat
      expect(isActive('weekends 10:00-14:00', date(2026, 4, 6, 12, 0))).toBe(false); // Mon
    });

    it('matches daily keyword', () => {
      expect(isActive('daily 09:00-17:00', date(2026, 4, 6, 10, 0))).toBe(true);
      expect(isActive('daily 09:00-17:00', date(2026, 4, 11, 10, 0))).toBe(true);
    });
  });

  describe('time matching', () => {
    it('matches within time range', () => {
      expect(isActive('mon 09:00-17:00', date(2026, 4, 6, 9, 0))).toBe(true);
      expect(isActive('mon 09:00-17:00', date(2026, 4, 6, 16, 59))).toBe(true);
    });

    it('excludes at range end (half-open)', () => {
      expect(isActive('mon 09:00-17:00', date(2026, 4, 6, 17, 0))).toBe(false);
    });

    it('excludes before range start', () => {
      expect(isActive('mon 09:00-17:00', date(2026, 4, 6, 8, 59))).toBe(false);
    });

    it('matches multiple time ranges', () => {
      expect(isActive('mon 09:00-12:00,13:00-17:00', date(2026, 4, 6, 10, 0))).toBe(true);
      expect(isActive('mon 09:00-12:00,13:00-17:00', date(2026, 4, 6, 12, 30))).toBe(false);
      expect(isActive('mon 09:00-12:00,13:00-17:00', date(2026, 4, 6, 15, 0))).toBe(true);
    });

    it('matches allday', () => {
      expect(isActive('mon allday', date(2026, 4, 6, 0, 0))).toBe(true);
      expect(isActive('mon allday', date(2026, 4, 6, 23, 59))).toBe(true);
    });

    it('matches 24:00 end', () => {
      expect(isActive('mon 00:00-24:00', date(2026, 4, 6, 23, 59))).toBe(true);
    });
  });

  describe('overnight ranges', () => {
    it('matches on start day after start time', () => {
      expect(isActive('fri 22:00-06:00', date(2026, 4, 10, 23, 0))).toBe(true); // Fri 23:00
    });

    it('matches on next day before end time', () => {
      expect(isActive('fri 22:00-06:00', date(2026, 4, 11, 3, 0))).toBe(true); // Sat 03:00
    });

    it('excludes on start day before start time', () => {
      expect(isActive('fri 22:00-06:00', date(2026, 4, 10, 21, 0))).toBe(false); // Fri 21:00
    });

    it('excludes on next day after end time', () => {
      expect(isActive('fri 22:00-06:00', date(2026, 4, 11, 7, 0))).toBe(false); // Sat 07:00
    });

    it('does not spill into wrong day', () => {
      expect(isActive('fri 22:00-06:00', date(2026, 4, 12, 3, 0))).toBe(false); // Sun 03:00
    });
  });

  describe('ordinal days', () => {
    it('matches 1st Monday', () => {
      // 2026-04-06 is the 1st Monday of April
      expect(isActive('1st mon 09:00-17:00', date(2026, 4, 6, 10, 0))).toBe(true);
      // 2026-04-13 is the 2nd Monday
      expect(isActive('1st mon 09:00-17:00', date(2026, 4, 13, 10, 0))).toBe(false);
    });

    it('matches last Friday', () => {
      // 2026-04-24 is the last Friday of April
      expect(isActive('last fri 18:00-22:00', date(2026, 4, 24, 20, 0))).toBe(true);
      expect(isActive('last fri 18:00-22:00', date(2026, 4, 17, 20, 0))).toBe(false);
    });

    it('5th occurrence silently skips when nonexistent', () => {
      // April 2026 has only 4 Fridays (3, 10, 17, 24)
      expect(isActive('5th fri 09:00-17:00', date(2026, 4, 24, 10, 0))).toBe(false);
    });

    it('5th occurrence fires when it exists', () => {
      // May 2026 has 5 Fridays (1, 8, 15, 22, 29)
      expect(isActive('5th fri 09:00-17:00', date(2026, 5, 29, 10, 0))).toBe(true);
    });
  });

  describe('day exceptions', () => {
    it('excludes bare day', () => {
      expect(isActive('mon-fri 09:00-17:00 !wed', date(2026, 4, 8, 10, 0))).toBe(false); // Wed
      expect(isActive('mon-fri 09:00-17:00 !wed', date(2026, 4, 7, 10, 0))).toBe(true); // Tue
    });

    it('excludes day range', () => {
      expect(isActive('mon-fri 09:00-17:00 !mon-tue', date(2026, 4, 6, 10, 0))).toBe(false); // Mon
      expect(isActive('mon-fri 09:00-17:00 !mon-tue', date(2026, 4, 8, 10, 0))).toBe(true); // Wed
    });

    it('excludes ordinal day', () => {
      expect(isActive('sat 10:00-14:00 !1st sat', date(2026, 4, 4, 12, 0))).toBe(false); // 1st Sat
      expect(isActive('sat 10:00-14:00 !1st sat', date(2026, 4, 11, 12, 0))).toBe(true); // 2nd Sat
    });

    it('exception does not affect other rules (union)', () => {
      expect(
        isActive('mon 09:00-17:00 ; mon-fri 10:00-11:00 !mon', date(2026, 4, 6, 10, 30)),
      ).toBe(true); // Mon — rule 1 still fires even though rule 2 excepts Mon
    });
  });

  describe('time exceptions', () => {
    it('subtracts time window', () => {
      expect(isActive('weekdays 09:00-17:00 !12:00-13:00', date(2026, 4, 6, 12, 30))).toBe(false);
      expect(isActive('weekdays 09:00-17:00 !12:00-13:00', date(2026, 4, 6, 10, 0))).toBe(true);
      expect(isActive('weekdays 09:00-17:00 !12:00-13:00', date(2026, 4, 6, 13, 0))).toBe(true);
    });

    it('overnight time exception wraps', () => {
      expect(isActive('daily 00:00-24:00 !23:00-01:00', date(2026, 4, 6, 23, 30))).toBe(false);
      expect(isActive('daily 00:00-24:00 !23:00-01:00', date(2026, 4, 6, 0, 30))).toBe(false);
      expect(isActive('daily 00:00-24:00 !23:00-01:00', date(2026, 4, 6, 1, 0))).toBe(true);
    });
  });

  describe('mixed exceptions', () => {
    it('excludes both day and time', () => {
      // Exclude lunch AND first Monday
      const sched = 'weekdays 09:00-17:00 !12:00-13:00,1st mon';
      // 1st Monday — fully excluded
      expect(isActive(sched, date(2026, 4, 6, 10, 0))).toBe(false);
      // Tuesday at lunch — time excepted
      expect(isActive(sched, date(2026, 4, 7, 12, 30))).toBe(false);
      // Tuesday morning — active
      expect(isActive(sched, date(2026, 4, 7, 10, 0))).toBe(true);
    });
  });

  describe('fully cancelled rules', () => {
    it('never fires when all days excepted', () => {
      expect(isActive('mon 09:00-17:00 !mon', date(2026, 4, 6, 10, 0))).toBe(false);
    });

    it('never fires when all time excepted', () => {
      expect(isActive('mon 09:00-17:00 !09:00-17:00', date(2026, 4, 6, 10, 0))).toBe(false);
    });
  });

  describe('empty schedule', () => {
    it('never fires', () => {
      expect(isActive('', date(2026, 4, 6, 10, 0))).toBe(false);
    });
  });

  describe('multiple rules (union)', () => {
    it('unions rules', () => {
      const sched = 'mon-fri 09:00-17:00 ; sat 10:00-13:00';
      expect(isActive(sched, date(2026, 4, 6, 10, 0))).toBe(true); // Mon
      expect(isActive(sched, date(2026, 4, 11, 11, 0))).toBe(true); // Sat
      expect(isActive(sched, date(2026, 4, 12, 11, 0))).toBe(false); // Sun
    });
  });
});
