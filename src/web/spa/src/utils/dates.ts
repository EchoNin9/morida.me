// `new Date("2026-06-27")` parses as UTC midnight, which renders as the
// previous day in any timezone west of UTC. Parse YYYY-MM-DD as a local date
// so display matches what the user typed into a <input type="date">.
export function parseDateLocal(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}
