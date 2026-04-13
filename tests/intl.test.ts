import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser.js';
import { formatSchedule, IntlStrings } from '../src/intl.js';
import { DayOfWeek, Ordinal } from '../src/types.js';

function fmt(input: string, locale?: string | IntlStrings): string {
  return formatSchedule(parse(input), locale);
}

describe('formatSchedule', () => {
  describe('English (default)', () => {
    it('bare day + allday', () => {
      expect(fmt('mon allday')).toBe('Monday, all day');
    });

    it('day list + time range', () => {
      expect(fmt('mon,wed,fri 09:00-17:00')).toBe(
        'Monday, Wednesday and Friday, 9 AM to 5 PM',
      );
    });

    it('day range + time range', () => {
      expect(fmt('mon-fri 08:30-12:00')).toBe(
        'Monday to Friday, 8:30 AM to 12 PM',
      );
    });

    it('ordinal day', () => {
      expect(fmt('1st mon 09:00-17:00')).toBe('1st Monday, 9 AM to 5 PM');
      expect(fmt('last fri 10:00-11:00')).toBe(
        'last Friday, 10 AM to 11 AM',
      );
    });

    it('keywords', () => {
      expect(fmt('daily allday')).toBe('Every day, all day');
      expect(fmt('weekdays 09:00-17:00')).toBe('Weekdays, 9 AM to 5 PM');
      expect(fmt('weekends allday')).toBe('Weekends, all day');
    });

    it('multiple time ranges', () => {
      expect(fmt('mon 09:00-12:00,13:00-17:00')).toBe(
        'Monday, 9 AM to 12 PM, 1 PM to 5 PM',
      );
    });

    it('exceptions', () => {
      expect(fmt('mon-fri 09:00-17:00 !wed')).toBe(
        'Monday to Friday, 9 AM to 5 PM (except Wednesday)',
      );
    });

    it('multiple rules', () => {
      expect(fmt('mon 09:00-17:00; tue 10:00-16:00')).toBe(
        'Monday, 9 AM to 5 PM; Tuesday, 10 AM to 4 PM',
      );
    });

    it('time with minutes', () => {
      expect(fmt('mon 09:15-17:45')).toBe(
        'Monday, 9:15 AM to 5:45 PM',
      );
    });

    it('time exception', () => {
      expect(fmt('weekdays 09:00-17:00 !12:00-13:00')).toBe(
        'Weekdays, 9 AM to 5 PM (except 12 PM to 1 PM)',
      );
    });

    it('day list exception', () => {
      expect(fmt('mon-fri 09:00-17:00 !mon,wed')).toBe(
        'Monday to Friday, 9 AM to 5 PM (except Monday and Wednesday)',
      );
    });
  });

  describe('French', () => {
    it('bare day + allday', () => {
      expect(fmt('mon allday', 'fr')).toBe('lundi, toute la journée');
    });

    it('day range + time', () => {
      expect(fmt('mon-fri 09:00-17:00', 'fr')).toBe(
        'lundi à vendredi, 09h00 à 17h00',
      );
    });

    it('keyword', () => {
      expect(fmt('weekdays 08:00-12:00', 'fr')).toBe(
        'Jours ouvrables, 08h00 à 12h00',
      );
    });

    it('exceptions', () => {
      expect(fmt('daily 09:00-17:00 !sat,sun', 'fr')).toBe(
        'Tous les jours, 09h00 à 17h00 (sauf samedi et dimanche)',
      );
    });
  });

  describe('German', () => {
    it('bare day + allday', () => {
      expect(fmt('wed allday', 'de')).toBe('Mittwoch, ganztägig');
    });

    it('day list + time', () => {
      expect(fmt('mon,fri 10:00-14:00', 'de')).toBe(
        'Montag und Freitag, 10:00 bis 14:00',
      );
    });
  });

  describe('Spanish', () => {
    it('keyword', () => {
      expect(fmt('weekends allday', 'es')).toBe('Fines de semana, todo el día');
    });

    it('ordinal day', () => {
      expect(fmt('1st mon 09:00-10:00', 'es')).toBe(
        '1º lunes, 9:00 a 10:00',
      );
    });
  });

  describe('custom locale', () => {
    it('accepts custom IntlStrings', () => {
      const custom: IntlStrings = {
        days: {
          [DayOfWeek.Mon]: 'Seg',
          [DayOfWeek.Tue]: 'Ter',
          [DayOfWeek.Wed]: 'Qua',
          [DayOfWeek.Thu]: 'Qui',
          [DayOfWeek.Fri]: 'Sex',
          [DayOfWeek.Sat]: 'Sáb',
          [DayOfWeek.Sun]: 'Dom',
        },
        ordinals: {
          [Ordinal.First]: '1º',
          [Ordinal.Second]: '2º',
          [Ordinal.Third]: '3º',
          [Ordinal.Fourth]: '4º',
          [Ordinal.Fifth]: '5º',
          [Ordinal.Last]: 'último',
        },
        keywords: {
          daily: 'Todos os dias',
          weekdays: 'Dias úteis',
          weekends: 'Fins de semana',
        },
        allday: 'o dia todo',
        to: 'até',
        except: 'exceto',
        and: 'e',
        ruleSeparator: '; ',
        formatTime: (h, m) => `${h}:${String(m).padStart(2, '0')}`,
      };

      expect(fmt('mon-fri 09:00-18:00', custom)).toBe(
        'Seg até Sex, 9:00 até 18:00',
      );
    });
  });

  describe('error handling', () => {
    it('throws on unsupported locale', () => {
      const schedule = parse('mon allday');
      expect(() => formatSchedule(schedule, 'zz')).toThrow('Unsupported locale "zz"');
    });
  });
});
