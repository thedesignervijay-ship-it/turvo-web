import { todayLocalDate } from '../lib/format.js';
import { listTurfs } from './turfs.service.js';
import { dashboardCounts } from './bookings.service.js';
import { earningsSummary } from './reports.service.js';
import { listBookings } from './bookings.service.js';

export interface OwnerDashboard {
  totalTurfs: number;
  activeTurfs: number;
  totalCourts: number;
  todayBookings: number;
  upcomingBookings: number;
  todayValue: number;
  monthValue: number;
  cancelledBookings: number;
}

/**
 * Owner dashboard metrics (spec section 21). Each figure comes from an
 * existing owner-scoped endpoint; no server-side aggregate endpoint exists
 * for owners, so the values are composed client-side.
 */
export async function getOwnerDashboard(): Promise<OwnerDashboard> {
  const [turfs, counts, earnings, upcoming] = await Promise.all([
    listTurfs({ page: 1, limit: 100 }),
    dashboardCounts(),
    earningsSummary(),
    listBookings({ page: 1, limit: 1, status: 'CONFIRMED', dateFrom: todayLocalDate() }),
  ]);

  return {
    totalTurfs: turfs.pagination.total,
    activeTurfs: turfs.items.filter((t) => t.status === 'ACTIVE').length,
    totalCourts: turfs.items.reduce((sum, turf) => sum + turf.courtCount, 0),
    todayBookings: counts.today,
    upcomingBookings: upcoming.total,
    todayValue: earnings.todayValue,
    monthValue: earnings.monthValue,
    cancelledBookings: counts.cancelled,
  };
}
