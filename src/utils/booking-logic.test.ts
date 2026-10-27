import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isVipPc,
  getPcRate,
  isValidPromo,
  calculateTotal,
  hasOverlap,
  generateIcsCalendar,
  isSlotInPast,
  getTimeSlotsForDate,
  findFirstAvailablePc,
  getPcOccupancyBadge,
  formatBookingTimeRange,
  matchesBookingSearch,
  filterAndSortBookings,
  getBookingLiveState,
  computeAdminDashboard,
  getPcSpecs,
  STANDARD_RATE,
  VIP_RATE,
} from './booking-logic.ts';
import type { Booking } from '../types.ts';

test('getPcSpecs returns complete hardware specifications for Standard and VIP PCs', () => {
  const stdSpecs = getPcSpecs(2);
  assert.equal(stdSpecs.zoneKey, 'standard');
  assert.match(stdSpecs.gpu, /RTX 3060/);
  assert.match(stdSpecs.cpu, /i5-12400F/);
  assert.match(stdSpecs.monitor, /144 Гц/);
  assert.match(stdSpecs.games, /CS2/);
  assert.match(stdSpecs.games, /Steam/);

  const vipSpecs = getPcSpecs(8);
  assert.equal(vipSpecs.zoneKey, 'vip');
  assert.match(vipSpecs.gpu, /RTX 4070 Super/);
  assert.match(vipSpecs.cpu, /i7-13700KF/);
  assert.match(vipSpecs.monitor, /240 Гц/);
  assert.match(vipSpecs.games, /Cyberpunk 2077/);
});

test('isVipPc accurately classifies PC zones', () => {
  assert.equal(isVipPc(1), false);
  assert.equal(isVipPc(6), false);
  assert.equal(isVipPc(7), true);
  assert.equal(isVipPc(10), true);
  assert.equal(isVipPc(11), false);
  assert.equal(isVipPc(0), false);
});

test('getPcRate assigns correct prices', () => {
  assert.equal(getPcRate(1), STANDARD_RATE);
  assert.equal(getPcRate(6), STANDARD_RATE);
  assert.equal(getPcRate(7), VIP_RATE);
  assert.equal(getPcRate(10), VIP_RATE);
});

test('isValidPromo verifies promotional codes correctly', () => {
  assert.equal(isValidPromo('btmsh'), true);
  assert.equal(isValidPromo('  BTMSH  '), true);
  assert.equal(isValidPromo('btmsh123'), false);
  assert.equal(isValidPromo(''), false);
  assert.equal(isValidPromo(undefined), false);
});

test('calculateTotal computes standard and VIP totals with promo discount', () => {
  assert.equal(calculateTotal(3, 2), 300);
  assert.equal(calculateTotal(8, 3), 750);
  assert.equal(calculateTotal(3, 2, 'btmsh'), 255);
  assert.equal(calculateTotal(9, 4, 'BTMSH'), 850);
});

test('hasOverlap detects schedule collision intervals accurately', () => {
  assert.equal(
    hasOverlap({ start: 1000, end: 2000 }, { start: 1500, end: 2500 }),
    true
  );
  assert.equal(
    hasOverlap({ start: 1000, end: 2000 }, { start: 2000, end: 3000 }),
    false
  );
  assert.equal(
    hasOverlap({ start: 1000, end: 1500 }, { start: 2000, end: 2500 }),
    false
  );
  assert.equal(
    hasOverlap({ start: 1000, end: 3000 }, { start: 1500, end: 2000 }),
    true
  );
});

test('isSlotInPast and getTimeSlotsForDate disable past slots on current day', () => {
  const refNow = Date.parse('2026-10-26T12:15:00+04:00');
  assert.equal(isSlotInPast('2026-10-26', '12:00', refNow), true);
  assert.equal(isSlotInPast('2026-10-26', '12:30', refNow), false);
  assert.equal(isSlotInPast('2026-10-27', '00:00', refNow), false);

  const slotsToday = getTimeSlotsForDate('2026-10-26', refNow);
  const slot1200 = slotsToday.find((s) => s.value === '12:00');
  const slot1230 = slotsToday.find((s) => s.value === '12:30');
  assert.equal(slot1200?.disabled, true);
  assert.equal(slot1230?.disabled, false);
});

test('findFirstAvailablePc selects free station within chosen zone', () => {
  assert.equal(findFirstAvailablePc('standard', [1, 2]), 3);
  assert.equal(findFirstAvailablePc('vip', [7]), 8);
  assert.equal(findFirstAvailablePc('vip', [7, 8, 9, 10]), null);
  assert.equal(findFirstAvailablePc('all', [1, 2, 3, 4, 5, 6]), 7);
});

test('getPcOccupancyBadge reports exact until/from times in Saratov timezone', () => {
  const reqStart = Date.parse('2026-10-26T12:00:00+04:00');
  const reqEnd = Date.parse('2026-10-26T16:00:00+04:00');

  const badgeUntil = getPcOccupancyBadge(1, reqStart, reqEnd, [
    {
      pc: 1,
      start: Date.parse('2026-10-26T11:00:00+04:00'),
      end: Date.parse('2026-10-26T13:30:00+04:00'),
    },
  ]);
  assert.equal(badgeUntil.isTaken, true);
  assert.equal(badgeUntil.label, 'ЗАНЯТ ДО 13:30');

  const badgeFrom = getPcOccupancyBadge(2, reqStart, reqEnd, [
    {
      pc: 2,
      start: Date.parse('2026-10-26T14:00:00+04:00'),
      end: Date.parse('2026-10-26T16:00:00+04:00'),
    },
  ]);
  assert.equal(badgeFrom.isTaken, true);
  assert.equal(badgeFrom.label, 'ЗАНЯТ С 14:00');
});

test('matchesBookingSearch finds by padded PC, #ID, email, and nickname', () => {
  const sample: Booking = {
    id: '5a0f3963-1111-2222-3333-444444444444',
    name: 'ShadowPlayer',
    pc: 8,
    start: 1700000000000,
    end: 1700007200000,
    total: 500,
    status: 'active',
    ownerEmail: 'shadow@frag.local',
  };

  assert.equal(matchesBookingSearch(sample, '08'), true);
  assert.equal(matchesBookingSearch(sample, 'PC 08'), true);
  assert.equal(matchesBookingSearch(sample, 'пк 8'), true);
  assert.equal(matchesBookingSearch(sample, '#5A0F'), true);
  assert.equal(matchesBookingSearch(sample, 'shadow@frag.local'), true);
  assert.equal(matchesBookingSearch(sample, 'VIP'), true);
  assert.equal(matchesBookingSearch(sample, 'PC 03'), false);
});

test('filterAndSortBookings orders active sessions ascending (in-game & nearest first)', () => {
  const now = Date.parse('2026-10-26T12:15:00+04:00');
  const bookings: Booking[] = [
    {
      id: 'far-future',
      name: 'NextMonthPlayer',
      pc: 2,
      start: Date.parse('2026-11-20T18:00:00+04:00'),
      end: Date.parse('2026-11-20T20:00:00+04:00'),
      total: 300,
      status: 'active',
    },
    {
      id: 'in-game-now',
      name: 'PlayingRightNow',
      pc: 5,
      start: Date.parse('2026-10-26T11:30:00+04:00'),
      end: Date.parse('2026-10-26T13:30:00+04:00'),
      total: 300,
      status: 'active',
    },
    {
      id: 'soon-today',
      name: 'ComingIn15Min',
      pc: 1,
      start: Date.parse('2026-10-26T12:30:00+04:00'),
      end: Date.parse('2026-10-26T14:30:00+04:00'),
      total: 300,
      status: 'active',
    },
  ];

  const sortedActive = filterAndSortBookings(bookings, 'active', '', now);
  assert.deepEqual(
    sortedActive.map((b) => b.id),
    ['in-game-now', 'soon-today', 'far-future']
  );
});

test('computeAdminDashboard tracks in-game PCs and preserves today revenue after completion', () => {
  const now = Date.parse('2026-10-26T15:10:00+04:00');
  const bookings: Booking[] = [
    // Finished earlier today -> should still count in todayRevenue!
    {
      id: 'b1',
      name: 'MorningGuest',
      pc: 1,
      start: Date.parse('2026-10-26T10:00:00+04:00'),
      end: Date.parse('2026-10-26T12:00:00+04:00'),
      total: 300,
      status: 'active',
    },
    // Currently playing at 15:10
    {
      id: 'b2',
      name: 'CurrentGuest',
      pc: 8,
      start: Date.parse('2026-10-26T14:00:00+04:00'),
      end: Date.parse('2026-10-26T16:00:00+04:00'),
      total: 500,
      status: 'active',
    },
    // Cancelled today -> should NOT count in revenue
    {
      id: 'b3',
      name: 'CancelledGuest',
      pc: 3,
      start: Date.parse('2026-10-26T14:00:00+04:00'),
      end: Date.parse('2026-10-26T16:00:00+04:00'),
      total: 300,
      status: 'cancelled',
    },
  ];

  const stats = computeAdminDashboard(bookings, now);
  assert.equal(stats.inGameCount, 1);
  assert.equal(stats.todayRevenue, 800);
  assert.equal(stats.todaySessionsCount, 2);
  assert.equal(stats.stations[7].currentBooking?.name, 'CurrentGuest');
  assert.equal(stats.stations[0].currentBooking, null);
});

test('getBookingLiveState distinguishes in-game, upcoming, completed, and cancelled', () => {
  const now = 5000;
  assert.equal(getBookingLiveState({ status: 'active', start: 4000, end: 6000 }, now), 'in-game');
  assert.equal(getBookingLiveState({ status: 'active', start: 6000, end: 8000 }, now), 'upcoming');
  assert.equal(getBookingLiveState({ status: 'active', start: 1000, end: 3000 }, now), 'completed');
  assert.equal(
    getBookingLiveState({ status: 'cancelled', start: 4000, end: 6000 }, now),
    'cancelled'
  );
});

test('formatBookingTimeRange displays start and end time clearly', () => {
  const start = Date.parse('2026-10-26T11:30:00+04:00');
  const end = Date.parse('2026-10-26T13:30:00+04:00');
  const rangeStr = formatBookingTimeRange(start, end);
  assert.match(rangeStr, /11:30 — 13:30/);
});

test('generateIcsCalendar produces valid iCalendar format', () => {
  const sample = {
    id: 'test-uuid-12345678',
    pc: 8,
    start: 1700000000000,
    end: 1700007200000,
    total: 500,
  };
  const ics = generateIcsCalendar(sample);
  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:FRAG Cyber Lounge — ПК 08 \(VIP\)/);
  assert.match(ics, /UID:test-uuid-12345678@frag/);
  assert.match(ics, /END:VCALENDAR$/);
});

test('computeAdminDashboard aggregates full-year 2026 monthly revenue from January to December', () => {
  const now = Date.parse('2026-10-26T15:10:00+04:00');
  const bookings: Booking[] = [
    {
      id: 'jan-1',
      name: 'JanPlayer',
      pc: 2,
      start: Date.parse('2026-01-15T12:00:00+04:00'),
      end: Date.parse('2026-01-15T16:00:00+04:00'),
      total: 600,
      status: 'active',
    },
    {
      id: 'jul-1',
      name: 'JulPlayer',
      pc: 9,
      start: Date.parse('2026-07-20T18:00:00+04:00'),
      end: Date.parse('2026-07-20T22:00:00+04:00'),
      total: 1000,
      status: 'active',
    },
    {
      id: 'oct-1',
      name: 'OctPlayer',
      pc: 8,
      start: Date.parse('2026-10-26T14:00:00+04:00'),
      end: Date.parse('2026-10-26T16:00:00+04:00'),
      total: 500,
      status: 'active',
    },
  ];

  const stats = computeAdminDashboard(bookings, now);
  assert.equal(stats.year2026Revenue, 2100);
  assert.equal(stats.year2026StandardRevenue, 600);
  assert.equal(stats.year2026VipRevenue, 1500);
  assert.equal(stats.year2026SessionsCount, 3);
  assert.equal(stats.year2026Hours, 10);
  assert.equal(stats.monthly2026.length, 12);
  assert.equal(stats.monthly2026[0].revenue, 600); // January
  assert.equal(stats.monthly2026[6].revenue, 1000); // July
  assert.equal(stats.monthly2026[9].revenue, 500); // October

  const janOnly = filterAndSortBookings(bookings, 'all', '', now, '2026-01');
  assert.equal(janOnly.length, 1);
  assert.equal(janOnly[0].id, 'jan-1');
});

