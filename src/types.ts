export enum DayOfWeek {
  Mon = 1,
  Tue = 2,
  Wed = 3,
  Thu = 4,
  Fri = 5,
  Sat = 6,
  Sun = 7,
}

export enum Ordinal {
  First = 1,
  Second = 2,
  Third = 3,
  Fourth = 4,
  Fifth = 5,
  Last = -1,
}

export interface TimeRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

// Day expressions
export interface BareDayExpr {
  type: 'bare';
  day: DayOfWeek;
}

export interface DayListExpr {
  type: 'list';
  days: DayOfWeek[];
}

export interface DayRangeExpr {
  type: 'range';
  start: DayOfWeek;
  end: DayOfWeek;
}

export interface OrdinalDayExpr {
  type: 'ordinal';
  ordinal: Ordinal;
  day: DayOfWeek;
}

export interface DayKeywordExpr {
  type: 'keyword';
  keyword: 'daily' | 'weekdays' | 'weekends';
}

export type DayExpression =
  | BareDayExpr
  | DayListExpr
  | DayRangeExpr
  | OrdinalDayExpr
  | DayKeywordExpr;

// Time expressions
export interface AlldayExpr {
  type: 'allday';
}

export interface TimeRangesExpr {
  type: 'ranges';
  ranges: TimeRange[];
}

export type TimeExpression = AlldayExpr | TimeRangesExpr;

// Exception expressions
export type DayExceptionExpression =
  | BareDayExpr
  | DayListExpr
  | DayRangeExpr
  | OrdinalDayExpr;

export interface TimeExceptionExpression {
  type: 'time';
  range: TimeRange;
}

export type ExceptionExpression =
  | DayExceptionExpression
  | TimeExceptionExpression;

export interface ExceptionClause {
  expressions: ExceptionExpression[];
}

export interface Rule {
  dayExpr: DayExpression;
  timeExpr: TimeExpression;
  exceptions: ExceptionClause | null;
}

export interface Schedule {
  rules: Rule[];
}

export class ParseError extends Error {
  constructor(
    message: string,
    public position: number,
    public input: string,
  ) {
    super(`${message} at position ${position}`);
    this.name = 'ParseError';
  }
}
