import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

/** Maps a status/approval-status string to a badge tone. */
export function statusTone(value: string): BadgeTone {
  switch (value) {
    case 'ACTIVE':
    case 'APPROVED':
    case 'CONFIRMED':
    case 'COMPLETED':
      return 'success';
    case 'PENDING':
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
    case 'DRAFT':
      return 'warning';
    case 'INACTIVE':
    case 'CANCELLED':
    case 'REJECTED':
    case 'INVALID':
      return 'danger';
    default:
      return 'neutral';
  }
}
