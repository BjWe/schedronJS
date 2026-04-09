import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser.js';
import { DayOfWeek, Ordinal, ParseError } from '../src/types.js';

describe('parser', () => {
  describe('empty schedule', () => {
    it('parses empty string', () => {
      expect(parse('')).toEqual({ rules: [] });
    });

    it('parses whitespace-only', () => {
      expect(parse('   \t  ')).toEqual({ rules: [] });
    });
  });

  describe('bare day', () => {
    it('parses all seven days', () => {
      for (const [token, expected] of Object.entries({
        mon: DayOfWeek.Mon,
        tue: DayOfWeek.Tue,
        wed: DayOfWeek.Wed,
        thu: DayOfWeek.Thu,
        fri: DayOfWeek.Fri,
        sat: DayOfWeek.Sat,
        sun: DayOfWeek.Sun,
      })) {
        const sched = parse(`${token} 09:00-17:00`);
        expect(sched.rules[0].dayExpr).toEqual({ type: 'bare', day: expected });
      }
    });
  });

  describe('day list', () => {
    it('parses two-day list', () => {
      const sched = parse('mon,fri 09:00-17:00');
      expect(sched.rules[0].dayExpr).toEqual({
        type: 'list',
        days: [DayOfWeek.Mon, DayOfWeek.Fri],
      });
    });

    it('parses three-day list', () => {
      const sched = parse('mon,wed,fri 09:00-17:00');
      expect(sched.rules[0].dayExpr).toEqual({
        type: 'list',
        days: [DayOfWeek.Mon, DayOfWeek.Wed, DayOfWeek.Fri],
      });
    });

    it('deduplicates', () => {
      const sched = parse('mon,mon,fri 09:00-17:00');
      expect(sched.rules[0].dayExpr).toEqual({
        type: 'list',
        days: [DayOfWeek.Mon, DayOfWeek.Fri],
      });
    });

    it('rejects spaces around comma', () => {
      expect(() => parse('mon , fri 09:00-17:00')).toThrow(ParseError);
    });
  });

  describe('day range', () => {
    it('parses forward range', () => {
      const sched = parse('mon-fri 09:00-17:00');
      expect(sched.rules[0].dayExpr).toEqual({
        type: 'range',
        start: DayOfWeek.Mon,
        end: DayOfWeek.Fri,
      });
    });

    it('parses wrapping range', () => {
      const sched = parse('fri-mon 09:00-17:00');
      expect(sched.rules[0].dayExpr).toEqual({
        type: 'range',
        start: DayOfWeek.Fri,
        end: DayOfWeek.Mon,
      });
    });

    it('rejects same-day range', () => {
      expect(() => parse('mon-mon 09:00-17:00')).toThrow(ParseError);
    });

    it('rejects spaces around dash', () => {
      expect(() => parse('mon - fri 09:00-17:00')).toThrow(ParseError);
    });
  });

  describe('ordinal day', () => {
    it('parses numbered ordinals', () => {
      const cases: [string, Ordinal][] = [
        ['1st', Ordinal.First],
        ['2nd', Ordinal.Second],
        ['3rd', Ordinal.Third],
        ['4th', Ordinal.Fourth],
        ['5th', Ordinal.Fifth],
      ];
      for (const [token, expected] of cases) {
        const sched = parse(`${token} mon 09:00-17:00`);
        expect(sched.rules[0].dayExpr).toEqual({
          type: 'ordinal',
          ordinal: expected,
          day: DayOfWeek.Mon,
        });
      }
    });

    it('parses last', () => {
      const sched = parse('last fri 18:00-22:00');
      expect(sched.rules[0].dayExpr).toEqual({
        type: 'ordinal',
        ordinal: Ordinal.Last,
        day: DayOfWeek.Fri,
      });
    });
  });

  describe('day keyword', () => {
    it('parses weekdays', () => {
      const sched = parse('weekdays 09:00-17:00');
      expect(sched.rules[0].dayExpr).toEqual({
        type: 'keyword',
        keyword: 'weekdays',
      });
    });

    it('parses weekends', () => {
      const sched = parse('weekends 10:00-14:00');
      expect(sched.rules[0].dayExpr).toEqual({
        type: 'keyword',
        keyword: 'weekends',
      });
    });

    it('parses daily', () => {
      const sched = parse('daily allday');
      expect(sched.rules[0].dayExpr).toEqual({
        type: 'keyword',
        keyword: 'daily',
      });
    });
  });

  describe('time expression', () => {
    it('parses single time range', () => {
      const sched = parse('mon 09:00-17:00');
      expect(sched.rules[0].timeExpr).toEqual({
        type: 'ranges',
        ranges: [{ startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
      });
    });

    it('parses multiple time ranges', () => {
      const sched = parse('mon 09:00-12:00,13:00-17:00');
      expect(sched.rules[0].timeExpr).toEqual({
        type: 'ranges',
        ranges: [
          { startHour: 9, startMinute: 0, endHour: 12, endMinute: 0 },
          { startHour: 13, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      });
    });

    it('parses allday', () => {
      const sched = parse('mon allday');
      expect(sched.rules[0].timeExpr).toEqual({ type: 'allday' });
    });

    it('parses 24:00 as end time', () => {
      const sched = parse('mon 00:00-24:00');
      expect(sched.rules[0].timeExpr).toEqual({
        type: 'ranges',
        ranges: [{ startHour: 0, startMinute: 0, endHour: 24, endMinute: 0 }],
      });
    });

    it('parses overnight range', () => {
      const sched = parse('fri 22:00-06:00');
      expect(sched.rules[0].timeExpr).toEqual({
        type: 'ranges',
        ranges: [{ startHour: 22, startMinute: 0, endHour: 6, endMinute: 0 }],
      });
    });

    it('rejects same start and end', () => {
      expect(() => parse('mon 09:00-09:00')).toThrow(ParseError);
    });

    it('rejects spaces around comma', () => {
      expect(() => parse('mon 09:00-12:00 , 13:00-17:00')).toThrow();
    });
  });

  describe('exception clause', () => {
    it('parses bare day exception', () => {
      const sched = parse('mon-fri 09:00-17:00 !mon');
      expect(sched.rules[0].exceptions).toEqual({
        expressions: [{ type: 'bare', day: DayOfWeek.Mon }],
      });
    });

    it('parses ordinal exception', () => {
      const sched = parse('sat 10:00-14:00 !1st sat');
      expect(sched.rules[0].exceptions).toEqual({
        expressions: [
          { type: 'ordinal', ordinal: Ordinal.First, day: DayOfWeek.Sat },
        ],
      });
    });

    it('parses day range exception', () => {
      const sched = parse('mon-fri 09:00-17:00 !mon-tue');
      expect(sched.rules[0].exceptions).toEqual({
        expressions: [
          { type: 'range', start: DayOfWeek.Mon, end: DayOfWeek.Tue },
        ],
      });
    });

    it('parses time range exception', () => {
      const sched = parse('weekdays 09:00-17:00 !12:00-13:00');
      expect(sched.rules[0].exceptions).toEqual({
        expressions: [
          {
            type: 'time',
            range: {
              startHour: 12,
              startMinute: 0,
              endHour: 13,
              endMinute: 0,
            },
          },
        ],
      });
    });

    it('parses mixed exceptions', () => {
      const sched = parse('weekdays 09:00-17:00 !12:00-13:00,1st mon');
      expect(sched.rules[0].exceptions!.expressions).toHaveLength(2);
      expect(sched.rules[0].exceptions!.expressions[0].type).toBe('time');
      expect(sched.rules[0].exceptions!.expressions[1].type).toBe('ordinal');
    });

    it('allows no space before !', () => {
      const sched = parse('mon 09:00-17:00!tue');
      expect(sched.rules[0].exceptions).toBeTruthy();
    });

    it('allows space after !', () => {
      const sched = parse('mon 09:00-17:00 ! tue');
      expect(sched.rules[0].exceptions).toBeTruthy();
    });

    it('rejects day keyword in exception', () => {
      expect(() => parse('mon-fri 09:00-17:00 !weekdays')).toThrow(ParseError);
    });
  });

  describe('multiple rules', () => {
    it('parses semicolon-separated rules', () => {
      const sched = parse('mon-fri 09:00-17:00 ; sat 10:00-13:00');
      expect(sched.rules).toHaveLength(2);
    });

    it('allows trailing semicolon', () => {
      const sched = parse('mon 09:00-17:00 ;');
      expect(sched.rules).toHaveLength(1);
    });

    it('allows no space around semicolon', () => {
      const sched = parse('mon 09:00-17:00;tue 09:00-17:00');
      expect(sched.rules).toHaveLength(2);
    });
  });

  describe('case normalization', () => {
    it('accepts uppercase input', () => {
      const sched = parse('MON-FRI 09:00-17:00');
      expect(sched.rules[0].dayExpr).toEqual({
        type: 'range',
        start: DayOfWeek.Mon,
        end: DayOfWeek.Fri,
      });
    });
  });
});
