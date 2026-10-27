import type { Booking, BookingLiveState, FilterTab } from '../types.ts';

/**
 * Pure domain logic for FRAG Cyber Lounge
 * Decoupled from React components for fast unit testing and reliability.
 */

export const STANDARD_RATE = 150;
export const VIP_RATE = 250;
export const PROMO_CODE = 'btmsh';
export const PROMO_DISCOUNT_PERCENT = 15;
export const SARATOV_OFFSET_MS = 4 * 3600000;

export const CLUB_ADDRESS = 'г. Саратов, ул. им. Чапаева В.И., 68';
export const CLUB_SHORT_ADDRESS = 'Саратов, ул. Чапаева, 68';
export const CLUB_PHONE = '+7 (8452) 77-04-24';

export interface PcHardwareSpecs {
  zoneKey: 'standard' | 'vip';
  zoneTitle: string;
  stationsLabel: string;
  rate: number;
  gpu: string;
  cpu: string;
  ram: string;
  storage: string;
  monitor: string;
  mouse: string;
  keyboard: string;
  headset: string;
  chair: string;
  games: string;
}

export const HARDWARE_SPECS: Record<'standard' | 'vip', PcHardwareSpecs> = {
  standard: {
    zoneKey: 'standard',
    zoneTitle: 'STANDARD ZONE',
    stationsLabel: 'PC 01–06 · Общий зал',
    rate: STANDARD_RATE,
    gpu: 'NVIDIA GeForce RTX 3060 (12 ГБ GDDR6)',
    cpu: 'Intel Core i5-12400F (6 ядер / 12 потоков, до 4.4 ГГц)',
    ram: '16 ГБ DDR4 3600 МГц (2×8 ГБ Dual Channel)',
    storage: '1 ТБ NVMe M.2 PCIe 4.0 SSD',
    monitor: '27″ ASUS TUF Gaming · IPS · 144 Гц · 1 мс',
    mouse: 'Logitech G102 Lightsync (8000 DPI)',
    keyboard: 'Механическая Red Square Keyrox TKL (G3ms Sapphire)',
    headset: 'HyperX Cloud II 7.1 Surround',
    chair: 'Игровое кресло Cougar Armor One',
    games: 'Steam, FACEIT, Riot, Battle.net, Epic · CS2, Dota 2, Valorant, PUBG, Apex, GTA V, Fortnite',
  },
  vip: {
    zoneKey: 'vip',
    zoneTitle: 'VIP ROOM',
    stationsLabel: 'PC 07–10 · Отдельная комната',
    rate: VIP_RATE,
    gpu: 'NVIDIA GeForce RTX 4070 Super (12 ГБ GDDR6X)',
    cpu: 'Intel Core i7-13700KF (16 ядер / 24 потока, до 5.4 ГГц)',
    ram: '32 ГБ DDR5 6000 МГц (2×16 ГБ Kingston Fury)',
    storage: '2 ТБ Samsung 990 PRO NVMe PCIe 4.0 SSD',
    monitor: '27″ ASUS ROG Strix · Fast IPS · 240 Гц · 0.5 мс · G-Sync',
    mouse: 'Logitech G Pro X Superlight Wireless (25600 DPI)',
    keyboard: 'Кастомная механика Dark Project KD83A (Gateron Cap Teal)',
    headset: 'HyperX Cloud Alpha Wireless / Logitech G Pro X',
    chair: 'Премиум кресло AndaSeat Kaiser 3 XL + закрытый буткемп',
    games: 'Steam, FACEIT, Riot, Battle.net, Epic · CS2, Dota 2, Valorant, Cyberpunk 2077, Warzone, PUBG, Apex, GTA V',
  },
};

/**
 * Returns full hardware specifications for a given PC number (1-10)
 */
export function getPcSpecs(pc: number): PcHardwareSpecs {
  return isVipPc(pc) ? HARDWARE_SPECS.vip : HARDWARE_SPECS.standard;
}

/**
 * Returns true if PC number belongs to the VIP Room (stations 7-10)
 */
export function isVipPc(pc: number): boolean {
  return Number.isInteger(pc) && pc >= 7 && pc <= 10;
}

/**
 * Gets hourly rate in rubles for a given PC
 */
export function getPcRate(pc: number): number {
  return isVipPc(pc) ? VIP_RATE : STANDARD_RATE;
}

/**
 * Validates promo code (case-insensitive, trimmed)
 */
export function isValidPromo(promo?: string | null): boolean {
  if (!promo || typeof promo !== 'string') return false;
  return promo.trim().toLowerCase() === PROMO_CODE;
}

/**
 * Calculates total booking cost in rubles with optional promo discount
 */
export function calculateTotal(pc: number, hours: number, promo?: string | null): number {
  const rate = getPcRate(pc);
  const clampedHours = Math.max(1, Math.min(12, Math.floor(hours || 1)));
  const discountMultiplier = isValidPromo(promo) ? 0.85 : 1.0;
  return Math.round(rate * clampedHours * discountMultiplier);
}

/**
 * Formats a currency amount to Russian rubles
 */
export function formatRubles(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ₽`;
}

/**
 * Formats timestamp to Saratov / UTC+4 local date and time string
 */
export function formatBookingDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ru-RU', {
    timeZone: 'Europe/Saratov',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats timestamp to Saratov / UTC+4 HH:MM string
 */
export function formatSaratovTime(timestamp: number): string {
  return new Date(timestamp + SARATOV_OFFSET_MS).toISOString().slice(11, 16);
}

/**
 * Formats full booking range (e.g. "26 октября, 11:30 — 13:30")
 */
export function formatBookingTimeRange(start: number, end: number): string {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Выберите время';
  const startDateStr = new Date(start).toLocaleString('ru-RU', {
    timeZone: 'Europe/Saratov',
    day: 'numeric',
    month: 'long',
  });
  const startTimeStr = formatSaratovTime(start);
  const endTimeStr = formatSaratovTime(end);
  return `${startDateStr}, ${startTimeStr} — ${endTimeStr}`;
}

/**
 * Returns today's YYYY-MM-DD in Saratov timezone (UTC+4)
 */
export function getSaratovTodayDate(nowMs: number = Date.now()): string {
  return new Date(nowMs + SARATOV_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Returns the current 30-min block start timestamp for immediate walk-in seating
 */
export function getCurrentHalfHourTimestamp(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1800000) * 1800000;
}

/**
 * Calculates the next comfortable 30-min booking slot (at least 15 mins ahead)
 */
export function getInitialSlot(nowMs: number = Date.now()): { date: string; time: string } {
  const nextHalfHour = Math.ceil((nowMs + 15 * 60000) / 1800000) * 1800000;
  const targetDate = new Date(nextHalfHour + SARATOV_OFFSET_MS);
  return {
    date: targetDate.toISOString().slice(0, 10),
    time: targetDate.toISOString().slice(11, 16),
  };
}

/**
 * Checks if a given YYYY-MM-DD and HH:MM in Saratov (UTC+4) is in the past
 */
export function isSlotInPast(
  dateStr: string,
  timeStr: string,
  nowMs: number = Date.now()
): boolean {
  if (!dateStr || !timeStr) return false;
  const ts = Date.parse(`${dateStr}T${timeStr}:00+04:00`);
  if (!Number.isFinite(ts)) return false;
  return ts < nowMs;
}

/**
 * Generates all 48 half-hour slots with `disabled` flag if on today's date and already passed
 */
export function getTimeSlotsForDate(
  dateStr: string,
  nowMs: number = Date.now()
): Array<{ value: string; disabled: boolean }> {
  return Array.from({ length: 48 }, (_, i) => {
    const hh = String(Math.floor(i / 2)).padStart(2, '0');
    const mm = i % 2 ? '30' : '00';
    const value = `${hh}:${mm}`;
    return {
      value,
      disabled: isSlotInPast(dateStr, value, nowMs),
    };
  });
}

/**
 * Finds the first available PC in the given zone category
 */
export function findFirstAvailablePc(
  category: 'all' | 'standard' | 'vip',
  occupiedPcs: number[]
): number | null {
  const candidates =
    category === 'vip'
      ? [7, 8, 9, 10]
      : category === 'standard'
      ? [1, 2, 3, 4, 5, 6]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  for (const pc of candidates) {
    if (!occupiedPcs.includes(pc)) return pc;
  }
  return null;
}

/**
 * Computes human-friendly status badge for a PC on the floor plan
 */
export function getPcOccupancyBadge(
  pc: number,
  reqStart: number,
  reqEnd: number,
  slots: Array<{ pc: number; start?: number; end?: number }>
): { isTaken: boolean; label: string } {
  const pcSlots = slots.filter((s) => s.pc === pc);
  if (pcSlots.length === 0) {
    return { isTaken: false, label: `${getPcRate(pc)} ₽ / ч` };
  }

  const withTimes = pcSlots.filter(
    (s): s is { pc: number; start: number; end: number } =>
      typeof s.start === 'number' && typeof s.end === 'number'
  );

  if (withTimes.length === 0) {
    return { isTaken: true, label: 'ЗАНЯТ' };
  }

  const activeAtStart = withTimes.filter((s) => s.start <= reqStart && s.end > reqStart);
  if (activeAtStart.length > 0) {
    const maxEnd = Math.max(...activeAtStart.map((s) => s.end));
    return { isTaken: true, label: `ЗАНЯТ ДО ${formatSaratovTime(maxEnd)}` };
  }

  const earliestConflict = Math.min(...withTimes.map((s) => s.start));
  return { isTaken: true, label: `ЗАНЯТ С ${formatSaratovTime(earliestConflict)}` };
}

/**
 * Determines the real-time operational state of a booking
 */
export function getBookingLiveState(
  booking: Pick<Booking, 'status' | 'start' | 'end'>,
  nowMs: number = Date.now()
): BookingLiveState {
  if (booking.status === 'cancelled') return 'cancelled';
  if (booking.end <= nowMs) return 'completed';
  if (booking.start <= nowMs && booking.end > nowMs) return 'in-game';
  return 'upcoming';
}

/**
 * Returns human-friendly remaining time for an active in-game session
 */
export function formatRemainingTime(endMs: number, nowMs: number = Date.now()): string {
  const diffMin = Math.max(1, Math.ceil((endMs - nowMs) / 60000));
  if (diffMin < 60) return `${diffMin} мин`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

/**
 * Smart search matcher supporting #ID, PC 08, 08, ПК 8, email, nickname, VIP/Standard
 */
export function matchesBookingSearch(booking: Booking, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const pcPad = String(booking.pc).padStart(2, '0');
  const shortId = booking.id.slice(0, 8).toLowerCase();
  const zoneLabel = isVipPc(booking.pc) ? 'vip room вип' : 'standard стандарт';

  const searchableTokens = [
    booking.name,
    booking.ownerEmail || '',
    booking.id,
    `#${shortId}`,
    shortId,
    String(booking.pc),
    pcPad,
    `pc ${booking.pc}`,
    `pc ${pcPad}`,
    `пк ${booking.pc}`,
    `пк ${pcPad}`,
    zoneLabel,
  ]
    .join(' ')
    .toLowerCase();

  return searchableTokens.includes(q);
}

export const MONTH_NAMES_2026 = [
  { index: 0, key: '2026-01', short: 'Янв', full: 'Январь', genitive: 'января' },
  { index: 1, key: '2026-02', short: 'Фев', full: 'Февраль', genitive: 'февраля' },
  { index: 2, key: '2026-03', short: 'Мар', full: 'Март', genitive: 'марта' },
  { index: 3, key: '2026-04', short: 'Апр', full: 'Апрель', genitive: 'апреля' },
  { index: 4, key: '2026-05', short: 'Май', full: 'Май', genitive: 'мая' },
  { index: 5, key: '2026-06', short: 'Июн', full: 'Июнь', genitive: 'июня' },
  { index: 6, key: '2026-07', short: 'Июл', full: 'Июль', genitive: 'июля' },
  { index: 7, key: '2026-08', short: 'Авг', full: 'Август', genitive: 'августа' },
  { index: 8, key: '2026-09', short: 'Сен', full: 'Сентябрь', genitive: 'сентября' },
  { index: 9, key: '2026-10', short: 'Окт', full: 'Октябрь', genitive: 'октября' },
  { index: 10, key: '2026-11', short: 'Ноя', full: 'Ноябрь', genitive: 'ноября' },
  { index: 11, key: '2026-12', short: 'Дек', full: 'Декабрь', genitive: 'декабря' },
] as const;

export interface MonthlyRevenueStat {
  monthIndex: number;
  monthKey: string;
  shortLabel: string;
  fullLabel: string;
  revenue: number;
  vipRevenue: number;
  standardRevenue: number;
  sessions: number;
  hours: number;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
}

/**
 * Returns YYYY-MM in Saratov timezone (UTC+4) for a booking timestamp
 */
export function getBookingMonthKey(timestamp: number): string {
  return new Date(timestamp + SARATOV_OFFSET_MS).toISOString().slice(0, 7);
}

/**
 * Filters and sorts bookings appropriately for the active tab:
 * - 'active': ascending by start (in-game sessions first, then nearest upcoming!)
 * - 'past' / 'all': descending by start (most recent first)
 * Supports optional monthKey filter (e.g., '2026-01' .. '2026-12')
 */
export function filterAndSortBookings(
  bookings: Booking[],
  filterTab: FilterTab,
  searchQuery: string,
  nowMs: number = Date.now(),
  monthFilter?: string | null
): Booking[] {
  const filtered = bookings.filter((b) => {
    const matchesTab =
      filterTab === 'all' ||
      (filterTab === 'active'
        ? b.status === 'active' && b.end > nowMs
        : b.status === 'cancelled' || b.end <= nowMs);

    const matchesMonth = !monthFilter || getBookingMonthKey(b.start) === monthFilter;

    return matchesTab && matchesMonth && matchesBookingSearch(b, searchQuery);
  });

  return [...filtered].sort((a, b) => {
    if (filterTab === 'active') {
      return a.start - b.start || a.pc - b.pc;
    }
    return b.start - a.start || a.pc - b.pc;
  });
}

/**
 * Computes real-time operational metrics, full-year 2026 monthly revenue (Jan–Dec),
 * and per-PC status for the Admin Control Center
 */
export function computeAdminDashboard(bookings: Booking[], nowMs: number = Date.now()) {
  const todayStr = getSaratovTodayDate(nowMs);
  const currentMonthKey = todayStr.slice(0, 7);

  let inGameCount = 0;
  let upcomingCount = 0;
  let todayRevenue = 0;
  let todaySessionsCount = 0;
  let totalValidRevenue = 0;

  let year2026Revenue = 0;
  let year2026VipRevenue = 0;
  let year2026StandardRevenue = 0;
  let year2026SessionsCount = 0;
  let year2026Hours = 0;

  const monthlyMap = new Map<
    string,
    { revenue: number; vipRevenue: number; standardRevenue: number; sessions: number; hours: number }
  >();
  for (const m of MONTH_NAMES_2026) {
    monthlyMap.set(m.key, {
      revenue: 0,
      vipRevenue: 0,
      standardRevenue: 0,
      sessions: 0,
      hours: 0,
    });
  }

  for (const b of bookings) {
    if (b.status !== 'cancelled') {
      totalValidRevenue += b.total;
      const bDateStr = new Date(b.start + SARATOV_OFFSET_MS).toISOString().slice(0, 10);
      const bMonthKey = bDateStr.slice(0, 7);
      const durationHours = Math.max(1, Math.round((b.end - b.start) / 3600000));
      const vip = isVipPc(b.pc);

      if (bDateStr === todayStr) {
        todayRevenue += b.total;
        todaySessionsCount += 1;
      }

      if (bDateStr.startsWith('2026-')) {
        year2026Revenue += b.total;
        year2026SessionsCount += 1;
        year2026Hours += durationHours;
        if (vip) {
          year2026VipRevenue += b.total;
        } else {
          year2026StandardRevenue += b.total;
        }

        const bucket = monthlyMap.get(bMonthKey);
        if (bucket) {
          bucket.revenue += b.total;
          bucket.sessions += 1;
          bucket.hours += durationHours;
          if (vip) {
            bucket.vipRevenue += b.total;
          } else {
            bucket.standardRevenue += b.total;
          }
        }
      }
    }

    const state = getBookingLiveState(b, nowMs);
    if (state === 'in-game') {
      inGameCount += 1;
    } else if (state === 'upcoming') {
      upcomingCount += 1;
    }
  }

  const monthly2026: MonthlyRevenueStat[] = MONTH_NAMES_2026.map((m) => {
    const stat = monthlyMap.get(m.key)!;
    return {
      monthIndex: m.index,
      monthKey: m.key,
      shortLabel: m.short,
      fullLabel: m.full,
      revenue: stat.revenue,
      vipRevenue: stat.vipRevenue,
      standardRevenue: stat.standardRevenue,
      sessions: stat.sessions,
      hours: stat.hours,
      isCurrentMonth: m.key === currentMonthKey,
      isFutureMonth: m.key > currentMonthKey,
    };
  });

  const currentMonthStat =
    monthly2026.find((m) => m.monthKey === currentMonthKey) || monthly2026[9];
  const maxMonthRevenue = Math.max(1, ...monthly2026.map((m) => m.revenue));
  const year2026AvgCheck =
    year2026SessionsCount > 0 ? Math.round(year2026Revenue / year2026SessionsCount) : 0;

  const stations = Array.from({ length: 10 }, (_, idx) => {
    const pc = idx + 1;
    const currentBooking =
      bookings.find(
        (b) => b.pc === pc && b.status === 'active' && b.start <= nowMs && b.end > nowMs
      ) || null;

    const nextBooking =
      bookings
        .filter((b) => b.pc === pc && b.status === 'active' && b.start > nowMs)
        .sort((a, b) => a.start - b.start)[0] || null;

    return {
      pc,
      isVip: isVipPc(pc),
      currentBooking,
      nextBooking,
    };
  });

  return {
    inGameCount,
    upcomingCount,
    todayRevenue,
    todaySessionsCount,
    totalValidRevenue,
    currentMonthRevenue: currentMonthStat.revenue,
    currentMonthSessionsCount: currentMonthStat.sessions,
    currentMonthLabel: currentMonthStat.fullLabel,
    year2026Revenue,
    year2026VipRevenue,
    year2026StandardRevenue,
    year2026SessionsCount,
    year2026Hours,
    year2026AvgCheck,
    maxMonthRevenue,
    monthly2026,
    stations,
  };
}

/**
 * Checks whether two time intervals overlap
 */
export function hasOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Generates an iCalendar (RFC 5545) .ics content string for a booking
 */
export function generateIcsCalendar(booking: {
  id: string;
  pc: number;
  start: number;
  end: number;
  total: number;
}): string {
  const toUtcCompact = (t: number) =>
    new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const zoneName = isVipPc(booking.pc) ? 'VIP' : 'STANDARD';
  const pcFormatted = String(booking.pc).padStart(2, '0');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FRAG//Booking//RU',
    'BEGIN:VEVENT',
    `UID:${booking.id}@frag`,
    `DTSTAMP:${toUtcCompact(Date.now())}`,
    `DTSTART:${toUtcCompact(booking.start)}`,
    `DTEND:${toUtcCompact(booking.end)}`,
    `SUMMARY:FRAG Cyber Lounge — ПК ${pcFormatted} (${zoneName})`,
    `LOCATION:FRAG Cyber Lounge (${CLUB_ADDRESS})`,
    `DESCRIPTION:Бронь #${booking.id.slice(0, 8).toUpperCase()}; Сумма: ${formatRubles(booking.total)}; Адрес: ${CLUB_ADDRESS}; Тел.: ${CLUB_PHONE}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
