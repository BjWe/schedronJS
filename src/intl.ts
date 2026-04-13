import {
  Schedule,
  Rule,
  DayExpression,
  TimeExpression,
  TimeRange,
  ExceptionClause,
  ExceptionExpression,
  DayOfWeek,
  Ordinal,
} from './types.js';

export interface IntlStrings {
  days: Record<DayOfWeek, string>;
  ordinals: Record<Ordinal, string>;
  keywords: Record<'daily' | 'weekdays' | 'weekends', string>;
  allday: string;
  to: string;
  except: string;
  and: string;
  ruleSeparator: string;
  formatTime: (hour: number, minute: number) => string;
}

const EN: IntlStrings = {
  days: {
    [DayOfWeek.Mon]: 'Monday',
    [DayOfWeek.Tue]: 'Tuesday',
    [DayOfWeek.Wed]: 'Wednesday',
    [DayOfWeek.Thu]: 'Thursday',
    [DayOfWeek.Fri]: 'Friday',
    [DayOfWeek.Sat]: 'Saturday',
    [DayOfWeek.Sun]: 'Sunday',
  },
  ordinals: {
    [Ordinal.First]: '1st',
    [Ordinal.Second]: '2nd',
    [Ordinal.Third]: '3rd',
    [Ordinal.Fourth]: '4th',
    [Ordinal.Fifth]: '5th',
    [Ordinal.Last]: 'last',
  },
  keywords: {
    daily: 'Every day',
    weekdays: 'Weekdays',
    weekends: 'Weekends',
  },
  allday: 'all day',
  to: 'to',
  except: 'except',
  and: 'and',
  ruleSeparator: '; ',
  formatTime: (hour, minute) => {
    const period = hour < 12 ? 'AM' : 'PM';
    const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return minute === 0 ? `${h} ${period}` : `${h}:${String(minute).padStart(2, '0')} ${period}`;
  },
};

const FR: IntlStrings = {
  days: {
    [DayOfWeek.Mon]: 'lundi',
    [DayOfWeek.Tue]: 'mardi',
    [DayOfWeek.Wed]: 'mercredi',
    [DayOfWeek.Thu]: 'jeudi',
    [DayOfWeek.Fri]: 'vendredi',
    [DayOfWeek.Sat]: 'samedi',
    [DayOfWeek.Sun]: 'dimanche',
  },
  ordinals: {
    [Ordinal.First]: '1er',
    [Ordinal.Second]: '2e',
    [Ordinal.Third]: '3e',
    [Ordinal.Fourth]: '4e',
    [Ordinal.Fifth]: '5e',
    [Ordinal.Last]: 'dernier',
  },
  keywords: {
    daily: 'Tous les jours',
    weekdays: 'Jours ouvrables',
    weekends: 'Week-ends',
  },
  allday: 'toute la journ\u00e9e',
  to: '\u00e0',
  except: 'sauf',
  and: 'et',
  ruleSeparator: ' ; ',
  formatTime: (hour, minute) =>
    `${String(hour).padStart(2, '0')}h${minute === 0 ? '00' : String(minute).padStart(2, '0')}`,
};

const DE: IntlStrings = {
  days: {
    [DayOfWeek.Mon]: 'Montag',
    [DayOfWeek.Tue]: 'Dienstag',
    [DayOfWeek.Wed]: 'Mittwoch',
    [DayOfWeek.Thu]: 'Donnerstag',
    [DayOfWeek.Fri]: 'Freitag',
    [DayOfWeek.Sat]: 'Samstag',
    [DayOfWeek.Sun]: 'Sonntag',
  },
  ordinals: {
    [Ordinal.First]: '1.',
    [Ordinal.Second]: '2.',
    [Ordinal.Third]: '3.',
    [Ordinal.Fourth]: '4.',
    [Ordinal.Fifth]: '5.',
    [Ordinal.Last]: 'letzter',
  },
  keywords: {
    daily: 'Jeden Tag',
    weekdays: 'Werktags',
    weekends: 'Wochenenden',
  },
  allday: 'ganzt\u00e4gig',
  to: 'bis',
  except: 'au\u00dfer',
  and: 'und',
  ruleSeparator: '; ',
  formatTime: (hour, minute) =>
    `${hour}:${String(minute).padStart(2, '0')}`,
};

const ES: IntlStrings = {
  days: {
    [DayOfWeek.Mon]: 'lunes',
    [DayOfWeek.Tue]: 'martes',
    [DayOfWeek.Wed]: 'mi\u00e9rcoles',
    [DayOfWeek.Thu]: 'jueves',
    [DayOfWeek.Fri]: 'viernes',
    [DayOfWeek.Sat]: 's\u00e1bado',
    [DayOfWeek.Sun]: 'domingo',
  },
  ordinals: {
    [Ordinal.First]: '1\u00ba',
    [Ordinal.Second]: '2\u00ba',
    [Ordinal.Third]: '3\u00ba',
    [Ordinal.Fourth]: '4\u00ba',
    [Ordinal.Fifth]: '5\u00ba',
    [Ordinal.Last]: '\u00faltimo',
  },
  keywords: {
    daily: 'Todos los d\u00edas',
    weekdays: 'D\u00edas laborables',
    weekends: 'Fines de semana',
  },
  allday: 'todo el d\u00eda',
  to: 'a',
  except: 'excepto',
  and: 'y',
  ruleSeparator: '; ',
  formatTime: (hour, minute) =>
    `${hour}:${String(minute).padStart(2, '0')}`,
};

const BUILTIN_LOCALES: Record<string, IntlStrings> = {
  en: EN,
  fr: FR,
  de: DE,
  es: ES,
};

function resolveStrings(locale: string | IntlStrings): IntlStrings {
  if (typeof locale === 'object') return locale;
  const base = locale.split('-')[0].toLowerCase();
  const strings = BUILTIN_LOCALES[base];
  if (!strings) {
    throw new Error(`Unsupported locale "${locale}". Use one of: ${Object.keys(BUILTIN_LOCALES).join(', ')}, or provide custom SchedronIntlStrings.`);
  }
  return strings;
}

function formatTimeRange(range: TimeRange, s: IntlStrings): string {
  const start = s.formatTime(range.startHour, range.startMinute);
  const end = s.formatTime(range.endHour, range.endMinute);
  return `${start} ${s.to} ${end}`;
}

function formatDayExpr(expr: DayExpression, s: IntlStrings): string {
  switch (expr.type) {
    case 'bare':
      return s.days[expr.day];
    case 'list':
      return joinList(expr.days.map((d) => s.days[d]), s.and);
    case 'range':
      return `${s.days[expr.start]} ${s.to} ${s.days[expr.end]}`;
    case 'ordinal':
      return `${s.ordinals[expr.ordinal]} ${s.days[expr.day]}`;
    case 'keyword':
      return s.keywords[expr.keyword];
  }
}

function formatTimeExpr(expr: TimeExpression, s: IntlStrings): string {
  if (expr.type === 'allday') return s.allday;
  return expr.ranges.map((r) => formatTimeRange(r, s)).join(', ');
}

function formatException(expr: ExceptionExpression, s: IntlStrings): string {
  if (expr.type === 'time') {
    return formatTimeRange(expr.range, s);
  }
  return formatDayExpr(expr, s);
}

function formatExceptions(clause: ExceptionClause, s: IntlStrings): string {
  const parts = clause.expressions.map((e) => formatException(e, s));
  return `${s.except} ${joinList(parts, s.and)}`;
}

function formatRule(rule: Rule, s: IntlStrings): string {
  const day = formatDayExpr(rule.dayExpr, s);
  const time = formatTimeExpr(rule.timeExpr, s);
  let result = `${day}, ${time}`;
  if (rule.exceptions) {
    result += ` (${formatExceptions(rule.exceptions, s)})`;
  }
  return result;
}

function joinList(items: string[], andWord: string): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} ${andWord} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} ${andWord} ${items[items.length - 1]}`;
}

export function formatSchedule(
  schedule: Schedule,
  locale: string | IntlStrings = 'en',
): string {
  const s = resolveStrings(locale);
  return schedule.rules.map((r) => formatRule(r, s)).join(s.ruleSeparator);
}
