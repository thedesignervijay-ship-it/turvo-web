/** Minimal CSV serialization (spec section 23: CSV export required). */

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeField).join(',');
  const body = rows.map((row) => row.map(escapeField).join(','));
  return [headerLine, ...body].join('\n');
}
