import {
  type Schedule,
  type Rule,
  type DayExpression,
  type TimeExpression,
  type TimeRange,
  type ExceptionClause,
  type ExceptionExpression,
  DayOfWeek,
  Ordinal,
  ParseError,
} from './types.js';

const DAY_MAP: Record<string, DayOfWeek> = {
  mon: DayOfWeek.Mon,
  tue: DayOfWeek.Tue,
  wed: DayOfWeek.Wed,
  thu: DayOfWeek.Thu,
  fri: DayOfWeek.Fri,
  sat: DayOfWeek.Sat,
  sun: DayOfWeek.Sun,
};

const ORDINAL_MAP: Record<string, Ordinal> = {
  '1st': Ordinal.First,
  '2nd': Ordinal.Second,
  '3rd': Ordinal.Third,
  '4th': Ordinal.Fourth,
  '5th': Ordinal.Fifth,
  last: Ordinal.Last,
};

const ORDINAL_TOKENS = ['1st', '2nd', '3rd', '4th', '5th', 'last'];
const DAY_TOKENS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const KEYWORD_TOKENS = ['daily', 'weekdays', 'weekends'];

export function parse(input: string): Schedule {
  const parser = new Parser(input.toLowerCase());
  return parser.parseSchedule();
}

class Parser {
  private pos = 0;

  constructor(private input: string) {}

  parseSchedule(): Schedule {
    this.skipWsp();
    if (this.atEnd()) {
      return { rules: [] };
    }

    const rules: Rule[] = [this.parseRule()];

    for (;;) {
      const saved = this.pos;
      this.skipWsp();
      if (this.atEnd()) break;
      if (this.tryConsume(';')) {
        this.skipWsp();
        if (this.atEnd()) break; // trailing semicolon
        // Check for another trailing semicolon
        const peek = this.pos;
        if (this.tryConsume(';')) {
          this.pos = peek;
          // Another semicolon — could be trailing
          continue;
        }
        rules.push(this.parseRule());
      } else {
        this.pos = saved;
        break;
      }
    }

    this.skipWsp();
    if (!this.atEnd()) {
      this.error('Expected end of input');
    }

    return { rules };
  }

  private parseRule(): Rule {
    const dayExpr = this.parseDayExpression();
    this.requireWsp();
    const timeExpr = this.parseTimeExpression();

    let exceptions: ExceptionClause | null = null;
    const saved = this.pos;
    this.skipWsp();
    if (this.tryConsume('!')) {
      this.skipWsp();
      exceptions = this.parseExceptionClause();
    } else {
      this.pos = saved;
    }

    return { dayExpr, timeExpr, exceptions };
  }

  private parseDayExpression(): DayExpression {
    // Try ordinal-day first (starts with ordinal token)
    const ordinal = this.tryOrdinal();
    if (ordinal !== null) {
      this.requireWsp();
      const day = this.consumeDay();
      return { type: 'ordinal', ordinal, day };
    }

    // Try day-keyword
    const keyword = this.tryKeyword();
    if (keyword !== null) {
      return { type: 'keyword', keyword };
    }

    // Must be bare day, day-list, or day-range — all start with a day
    const day = this.consumeDay();

    if (this.tryConsume('-')) {
      const end = this.consumeDay();
      if (day === end) {
        this.error(`Day range start and end must differ: got ${DAY_TOKENS[day - 1]}-${DAY_TOKENS[end - 1]}`);
      }
      return { type: 'range', start: day, end };
    }

    if (this.tryConsume(',')) {
      const days: DayOfWeek[] = [day, this.consumeDay()];
      while (this.tryConsume(',')) {
        days.push(this.consumeDay());
      }
      // Deduplicate
      const unique = [...new Set(days)];
      return { type: 'list', days: unique };
    }

    return { type: 'bare', day };
  }

  private parseExceptionClause(): ExceptionClause {
    const expressions: ExceptionExpression[] = [this.parseExceptionExpression()];
    while (this.tryConsume(',')) {
      expressions.push(this.parseExceptionExpression());
    }
    return { expressions };
  }

  private parseExceptionExpression(): ExceptionExpression {
    // Try ordinal-day first (ordinals like "1st" start with a digit too)
    const ordinal = this.tryOrdinal();
    if (ordinal !== null) {
      this.requireWsp();
      const day = this.consumeDay();
      return { type: 'ordinal', ordinal, day };
    }

    // Try time-range (starts with digit, but only after ruling out ordinals)
    if (this.peekIsDigit()) {
      const range = this.parseTimeRange();
      return { type: 'time', range };
    }

    // Check for keyword — not allowed in exceptions
    for (const kw of KEYWORD_TOKENS) {
      if (this.peekStr(kw) && !this.peekIsAlpha(kw.length)) {
        this.error(`Day keyword "${kw}" is not permitted in exception clauses`);
      }
    }

    // Must be bare day, day-list, or day-range
    const day = this.consumeDay();

    if (this.tryConsume('-')) {
      const end = this.consumeDay();
      if (day === end) {
        this.error(`Day range start and end must differ`);
      }
      return { type: 'range', start: day, end };
    }

    if (this.tryConsume(',')) {
      // Could be start of a day-list, or could be the exception-clause separator.
      // Per spec: comma-separated days are always parsed as a single day-list.
      // But we need to check if the next token is a day.
      const saved = this.pos;
      const nextDay = this.tryDay();
      if (nextDay !== null) {
        // Check what follows — if it's another comma or end/non-day, it's a day-list
        const days: DayOfWeek[] = [day, nextDay];
        while (this.tryConsume(',')) {
          const savedInner = this.pos;
          const d = this.tryDay();
          if (d !== null) {
            days.push(d);
          } else {
            // Not a day — put comma back and stop the day-list
            this.pos = savedInner - 1;
            break;
          }
        }
        const unique = [...new Set(days)];
        return { type: 'list', days: unique };
      } else {
        // Not a day after comma — revert, this comma is the exception-clause separator
        this.pos = saved - 1; // put back the comma
        return { type: 'bare', day };
      }
    }

    return { type: 'bare', day };
  }

  private parseTimeExpression(): TimeExpression {
    if (this.tryConsume('allday')) {
      return { type: 'allday' };
    }

    const ranges: TimeRange[] = [this.parseTimeRange()];
    while (this.tryConsume(',')) {
      ranges.push(this.parseTimeRange());
    }
    return { type: 'ranges', ranges };
  }

  private parseTimeRange(): TimeRange {
    const startHour = this.consumeHour();
    this.consume(':');
    const startMinute = this.consumeMinute();
    this.consume('-');
    // end-time: try "24:00" literal first
    let endHour: number;
    let endMinute: number;
    if (this.peekStr('24:00')) {
      this.consume('24:00');
      endHour = 24;
      endMinute = 0;
    } else {
      endHour = this.consumeHour();
      this.consume(':');
      endMinute = this.consumeMinute();
    }

    if (startHour === endHour && startMinute === endMinute) {
      this.error('Start and end time must differ');
    }

    return { startHour, startMinute, endHour, endMinute };
  }

  // --- Token consumers ---

  private consumeDay(): DayOfWeek {
    for (const token of DAY_TOKENS) {
      if (this.tryConsume(token)) {
        return DAY_MAP[token];
      }
    }
    this.error('Expected day abbreviation (mon, tue, wed, thu, fri, sat, sun)');
  }

  private tryDay(): DayOfWeek | null {
    for (const token of DAY_TOKENS) {
      if (this.peekStr(token) && !this.peekIsAlpha(token.length)) {
        this.pos += token.length;
        return DAY_MAP[token];
      }
    }
    return null;
  }

  private tryOrdinal(): Ordinal | null {
    for (const token of ORDINAL_TOKENS) {
      if (this.peekStr(token) && !this.peekIsAlpha(token.length)) {
        this.pos += token.length;
        return ORDINAL_MAP[token];
      }
    }
    return null;
  }

  private tryKeyword(): 'daily' | 'weekdays' | 'weekends' | null {
    for (const token of KEYWORD_TOKENS) {
      if (this.peekStr(token) && !this.peekIsAlpha(token.length)) {
        this.pos += token.length;
        return token as 'daily' | 'weekdays' | 'weekends';
      }
    }
    return null;
  }

  private consumeHour(): number {
    const d1 = this.consumeDigit();
    const d2 = this.consumeDigit();
    const hour = d1 * 10 + d2;
    if (hour > 23) {
      this.error(`Invalid hour: ${hour}`);
    }
    return hour;
  }

  private consumeMinute(): number {
    const d1 = this.consumeDigit();
    const d2 = this.consumeDigit();
    const minute = d1 * 10 + d2;
    if (minute > 59) {
      this.error(`Invalid minute: ${minute}`);
    }
    return minute;
  }

  private consumeDigit(): number {
    if (this.pos >= this.input.length) {
      this.error('Expected digit');
    }
    const ch = this.input[this.pos];
    if (ch >= '0' && ch <= '9') {
      this.pos++;
      return parseInt(ch, 10);
    }
    this.error('Expected digit');
  }

  // --- Helpers ---

  private consume(str: string): void {
    if (!this.input.startsWith(str, this.pos)) {
      this.error(`Expected "${str}"`);
    }
    this.pos += str.length;
  }

  private tryConsume(str: string): boolean {
    if (this.input.startsWith(str, this.pos)) {
      // For keyword/day tokens, ensure next char isn't alpha
      if (str.length > 1 && /[a-z]/.test(str[str.length - 1])) {
        if (this.peekIsAlpha(str.length)) return false;
      }
      this.pos += str.length;
      return true;
    }
    return false;
  }

  private peekStr(str: string): boolean {
    return this.input.startsWith(str, this.pos);
  }

  private peekIsDigit(): boolean {
    if (this.pos >= this.input.length) return false;
    const ch = this.input[this.pos];
    return ch >= '0' && ch <= '9';
  }

  private peekIsAlpha(offset: number = 0): boolean {
    const idx = this.pos + offset;
    if (idx >= this.input.length) return false;
    const ch = this.input[idx];
    return ch >= 'a' && ch <= 'z';
  }

  private skipWsp(): void {
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (ch === ' ' || ch === '\t') {
        this.pos++;
      } else {
        break;
      }
    }
  }

  private requireWsp(): void {
    if (
      this.pos >= this.input.length ||
      (this.input[this.pos] !== ' ' && this.input[this.pos] !== '\t')
    ) {
      this.error('Expected whitespace');
    }
    this.skipWsp();
  }

  private atEnd(): boolean {
    return this.pos >= this.input.length;
  }

  private error(message: string): never {
    throw new ParseError(message, this.pos, this.input);
  }
}
