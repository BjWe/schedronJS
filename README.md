# Schedron

A TypeScript parser and evaluator for the [Schedron scheduling language](https://github.com/bjwe/schedron/blob/main/spec/schedron.md) — a compact, human-readable format for expressing recurring schedules with exceptions.

Schedron sits between cron (terse, time-only) and full calendar formats (verbose, event-centric). It expresses **when** something recurs, not what happens, and is legible to non-technical users.

```
weekdays 09:00-17:00 !12:00-13:00
```

## Install

```bash
npm install schedron
```

## Usage

```typescript
import { parse, isActive, nextActivation, nextDeactivation } from 'schedron';

// Check if a schedule is active at a specific time
isActive('mon-fri 09:00-17:00', new Date());  // true if weekday, 9am–5pm

// Parse into a structured Schedule object
const schedule = parse('weekdays 09:00-17:00 !12:00-13:00');

// Use a parsed schedule to avoid re-parsing
isActive(schedule, new Date());

// Find the next activation/deactivation from a given time
nextActivation('mon 09:00-17:00', new Date());
nextDeactivation('mon 09:00-17:00', new Date());
```

## Schedule Syntax

A schedule is one or more semicolon-separated rules. Each rule binds a **day expression** to a **time expression**, with an optional **exception clause**.

```
<day-expression> <time-expression> [!<exception>,...]
```

### Day Expressions

| Form | Example | Description |
|------|---------|-------------|
| Bare day | `fri` | Single day |
| Day list | `mon,wed,fri` | Multiple days |
| Day range | `mon-fri` | Inclusive range (wraps: `fri-mon` = fri–sun + mon) |
| Ordinal day | `1st mon`, `last fri` | Nth occurrence in the month (1st–5th, last) |
| Keyword | `weekdays`, `weekends`, `daily` | Shorthand groups |

### Time Expressions

| Form | Example | Description |
|------|---------|-------------|
| Time range | `09:00-17:00` | 24-hour format, `24:00` allowed as end |
| Multiple ranges | `09:00-12:00,13:00-17:00` | Comma-separated |
| Overnight | `22:00-06:00` | Wraps past midnight |
| All day | `allday` | Equivalent to `00:00-24:00` |

### Exception Clauses

Append `!` followed by comma-separated day or time exceptions to subtract from a rule:

```
sat 09:00-14:00 !1st sat           # Saturdays, except the first of the month
weekdays 09:00-17:00 !12:00-13:00  # Weekdays 9–5, minus lunch hour
mon-fri 09:00-17:00 !mon,1st fri   # Exclude all Mondays and the first Friday
```

### More Examples

```
last fri 18:00-22:00               # Last Friday evening each month
fri 22:00-06:00                    # Overnight shift, Friday into Saturday
mon-fri 09:00-17:00 ; sat 10:00-13:00  # Weekdays + Saturday morning
daily allday                       # Always active
```

## API

### `parse(input: string): Schedule`

Parses a Schedron string into a `Schedule` AST. Throws `ParseError` on invalid input.

### `isActive(schedule: string | Schedule, datetime: Date): boolean`

Returns `true` if the given datetime falls within any active window of the schedule. Accepts a raw string or a pre-parsed `Schedule`.

### `nextActivation(schedule: string | Schedule, from: Date): Date | null`

Returns the next datetime at which the schedule becomes active, searching up to ~13 months from `from`. Returns `null` if no activation is found.

### `nextDeactivation(schedule: string | Schedule, from: Date): Date | null`

Returns the next datetime at which the schedule becomes inactive. Returns `null` if no deactivation is found.

## Design Notes

- **Timezone-naive** — all times are interpreted in the caller's timezone. Resolve timezone before evaluating.
- **Union semantics** — rules are unioned; exceptions only subtract within their own rule.
- **Empty schedules** are valid and never fire.

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
```

## License

MIT
