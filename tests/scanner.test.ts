import { describe, it, expect } from 'vitest';
import { nextActivation, nextDeactivation } from '../src/scanner.js';

function date(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

describe('nextActivation', () => {
  it('returns null for empty schedule', () => {
    expect(nextActivation('', date(2026, 4, 6, 10, 0))).toBeNull();
  });

  it('finds activation on same day', () => {
    const result = nextActivation('mon 09:00-17:00', date(2026, 4, 6, 8, 0));
    expect(result).toEqual(date(2026, 4, 6, 9, 0));
  });

  it('finds activation on next matching day', () => {
    // Tuesday — next Monday is April 13
    const result = nextActivation('mon 09:00-17:00', date(2026, 4, 7, 18, 0));
    expect(result).toEqual(date(2026, 4, 13, 9, 0));
  });

  it('returns current time if already active', () => {
    const result = nextActivation('mon 09:00-17:00', date(2026, 4, 6, 10, 0));
    expect(result).toEqual(date(2026, 4, 6, 10, 0));
  });

  it('finds next time range on same day', () => {
    const result = nextActivation(
      'mon 09:00-12:00,14:00-17:00',
      date(2026, 4, 6, 13, 0),
    );
    expect(result).toEqual(date(2026, 4, 6, 14, 0));
  });

  it('finds activation for ordinal day', () => {
    // From April 7 (Tue), next 1st Mon is May 4
    const result = nextActivation(
      '1st mon 09:00-17:00',
      date(2026, 4, 7, 10, 0),
    );
    expect(result).toEqual(date(2026, 5, 4, 9, 0));
  });
});

describe('nextDeactivation', () => {
  it('returns null when not active', () => {
    expect(nextDeactivation('mon 09:00-17:00', date(2026, 4, 6, 8, 0))).toBeNull();
  });

  it('returns null for empty schedule', () => {
    expect(nextDeactivation('', date(2026, 4, 6, 10, 0))).toBeNull();
  });

  it('finds end of current time range', () => {
    const result = nextDeactivation('mon 09:00-17:00', date(2026, 4, 6, 10, 0));
    expect(result).toEqual(date(2026, 4, 6, 17, 0));
  });

  it('finds deactivation for allday', () => {
    // daily allday — active all day every day. The next deactivation should be null
    // since it's always active (within scan window).
    const result = nextDeactivation('daily allday', date(2026, 4, 6, 10, 0));
    expect(result).toBeNull();
  });

  it('finds deactivation across overnight', () => {
    const result = nextDeactivation('fri 22:00-06:00', date(2026, 4, 10, 23, 0));
    expect(result).toEqual(date(2026, 4, 11, 6, 0));
  });
});
