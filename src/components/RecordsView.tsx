import React, { useState } from 'react';
import {
  RefreshCw,
  Download,
  CalendarDays,
  ArrowRight,
  Monitor,
  Check,
  Zap,
  Clock3,
  UserRound,
  Cpu,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  formatBookingTimeRange,
  formatSaratovTime,
  formatRubles,
  isVipPc,
  getPcSpecs,
  filterAndSortBookings,
  computeAdminDashboard,
  getBookingLiveState,
  formatRemainingTime,
  getCurrentHalfHourTimestamp,
  calculateTotal,
  getBookingMonthKey,
} from '../utils/booking-logic.ts';
import type { Booking, FilterTab, User, ViewTab } from '../types.ts';

interface RecordsViewProps {
  currentTab: ViewTab;
  currentUser: User | null;
  bookings: Booking[];
  loading: boolean;
  extendingId: string | null;
  filterTab: FilterTab;
  onFilterChange: (tab: FilterTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  successMessage: string;
  errorMessage: string;
  onRefresh: () => void;
  onCancelRequest: (booking: Booking) => void;
  onExtendBooking: (booking: Booking, addHours?: number) => void;
  onQuickWalkIn: (data: {
    pc: number;
    name: string;
    hours: number;
    start: number;
    promo?: string;
  }) => Promise<boolean>;
  onExportIcs: (booking: Booking) => void;
  onNavigateBooking: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  currentTab,
  currentUser,
  bookings,
  loading,
  extendingId,
  filterTab,
  onFilterChange,
  searchQuery,
  onSearchChange,
  successMessage,
  errorMessage,
  onRefresh,
  onCancelRequest,
  onExtendBooking,
  onQuickWalkIn,
  onExportIcs,
  onNavigateBooking,
}) => {
  const isAdmin = currentTab === 'admin';
  const now = Date.now();

  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState<number>(40);

  const dashboard = computeAdminDashboard(bookings, now);
  const filteredBookings = filterAndSortBookings(
    bookings,
    filterTab,
    searchQuery,
    now,
    isAdmin ? selectedMonthKey : null
  );
  const visibleBookings = filteredBookings.slice(0, visibleLimit);

  const monthScopedBookings =
    isAdmin && selectedMonthKey
      ? bookings.filter((b) => getBookingMonthKey(b.start) === selectedMonthKey)
      : bookings;

  const activeTabCount = monthScopedBookings.filter(
    (b) => b.status === 'active' && b.end > now
  ).length;
  const pastTabCount = monthScopedBookings.filter(
    (b) => b.status === 'cancelled' || b.end <= now
  ).length;

  const selectedMonthObj = selectedMonthKey
    ? dashboard.monthly2026.find((m) => m.monthKey === selectedMonthKey) || null
    : null;

  const vipSharePercent =
    dashboard.year2026Revenue > 0
      ? Math.round((dashboard.year2026VipRevenue / dashboard.year2026Revenue) * 100)
      : 0;
  const stdSharePercent = 100 - vipSharePercent;

  // Quick Walk-in state for Admin reception desk
  const firstFreeStation =
    dashboard.stations.find((s) => !s.currentBooking)?.pc ?? 1;
  const [walkInPc, setWalkInPc] = useState<number>(firstFreeStation);
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInHours, setWalkInHours] = useState<number>(2);
  const [walkInStartMode, setWalkInStartMode] = useState<'now' | 'next'>('now');
  const [walkInPromo, setWalkInPromo] = useState<string>('');
  const [walkInSubmitting, setWalkInSubmitting] = useState<boolean>(false);

  const currentHalfHour = getCurrentHalfHourTimestamp(now);
  const nextHalfHour = currentHalfHour + 1800000;
  const walkInStartTs = walkInStartMode === 'now' ? currentHalfHour : nextHalfHour;
  const walkInPrice = calculateTotal(walkInPc, walkInHours, walkInPromo);
  const walkInSpecs = getPcSpecs(walkInPc);

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInSubmitting(true);
    try {
      const effectiveGuestName =
        walkInName.trim() || `Гость ПК ${String(walkInPc).padStart(2, '0')}`;
      const ok = await onQuickWalkIn({
        pc: walkInPc,
        name: effectiveGuestName,
        hours: walkInHours,
        start: walkInStartTs,
        promo: walkInPromo || undefined,
      });
      if (ok) {
        setWalkInName('');
        setWalkInPromo('');
        const nextFree = dashboard.stations.find(
          (s) => !s.currentBooking && s.pc !== walkInPc
        )?.pc;
        if (nextFree) {
          setWalkInPc(nextFree);
        }
      }
    } finally {
      setWalkInSubmitting(false);
    }
  };

  return (
    <section className="records">
      <div className="section-heading">
        <div>
          <div className="eyebrow muted">
            FRAG / {isAdmin ? 'CONTROL CENTER · 2026' : 'PLAYER PROFILE'}
          </div>
          <h1>
            {isAdmin ? 'Управление клубом' : 'Мои бронирования'}
            <span>{'\u2198\uFE0E'}</span>
          </h1>
          {currentUser && (
            <p className="profile-identity">
              {currentUser.name} · {currentUser.email} ·{' '}
              {currentUser.role === 'admin' ? 'Администратор' : 'Игрок'}
            </p>
          )}
        </div>
        <button
          type="button"
          className="secondary"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Обновить
        </button>
      </div>

      {isAdmin && (
        <>
          <div className="stats stats-four">
            <div>
              <small>Сейчас в игре</small>
              <strong>{dashboard.inGameCount} / 10 ПК</strong>
              <span className="stat-sub">
                Свободно: {10 - dashboard.inGameCount} ПК · Ожидается: {dashboard.upcomingCount}
              </span>
            </div>
            <div>
              <small>Выручка за сегодня ({dashboard.todaySessionsCount} сессий)</small>
              <strong>{formatRubles(dashboard.todayRevenue)}</strong>
              <span className="stat-sub">Смена 24/7 · Саратов (UTC+4)</span>
            </div>
            <div>
              <small>
                За {dashboard.currentMonthLabel.toLowerCase()} ({dashboard.currentMonthSessionsCount}{' '}
                сессий)
              </small>
              <strong>{formatRubles(dashboard.currentMonthRevenue)}</strong>
              <span className="stat-sub">Текущий месяц 2026 г.</span>
            </div>
            <div className="stat-highlight">
              <small>Прибыль за 2026 год (с января)</small>
              <strong className="lime">{formatRubles(dashboard.year2026Revenue)}</strong>
              <span className="stat-sub">
                {dashboard.year2026SessionsCount.toLocaleString('ru-RU')} сессий ·{' '}
                {dashboard.year2026Hours.toLocaleString('ru-RU')} ч игры
              </span>
            </div>
          </div>

          {/* 2026 Annual Revenue Breakdown (January – December) */}
          <div className="admin-live-section revenue-2026-section" aria-label="Прибыль за 2026 год">
            <div className="admin-live-header">
              <div>
                <h2>
                  <TrendingUp size={16} className="lime" /> Прибыль и динамика клуба за 2026 год
                  (Январь — Декабрь)
                </h2>
                <p className="revenue-subtitle">
                  Нажмите на любой месяц, чтобы отфильтровать список бронирований и сессий за
                  выбранный период
                </p>
              </div>
              <div className="revenue-summary-pills">
                <span>
                  <i className="dot-std" /> Standard: {formatRubles(dashboard.year2026StandardRevenue)}{' '}
                  ({stdSharePercent}%)
                </span>
                <span>
                  <i className="dot-vip" /> VIP Room: {formatRubles(dashboard.year2026VipRevenue)} (
                  {vipSharePercent}%)
                </span>
                <span>Средний чек: {formatRubles(dashboard.year2026AvgCheck)}</span>
              </div>
            </div>

            <div className="months-2026-grid">
              {dashboard.monthly2026.map((m) => {
                const isSelected = selectedMonthKey === m.monthKey;
                const heightPct =
                  m.revenue > 0
                    ? Math.max(12, Math.round((m.revenue / dashboard.maxMonthRevenue) * 100))
                    : 4;
                const vipPctOfMonth =
                  m.revenue > 0 ? Math.round((m.vipRevenue / m.revenue) * 100) : 0;

                return (
                  <button
                    key={m.monthKey}
                    type="button"
                    className={`month-2026-card ${m.isCurrentMonth ? 'current-month ' : ''}${
                      m.isFutureMonth ? 'future-month ' : ''
                    }${isSelected ? 'selected-month' : ''}`}
                    onClick={() => {
                      setVisibleLimit(40);
                      if (isSelected) {
                        setSelectedMonthKey(null);
                      } else {
                        setSelectedMonthKey(m.monthKey);
                        if (filterTab === 'active' && !m.isFutureMonth && !m.isCurrentMonth) {
                          onFilterChange('all');
                        }
                      }
                    }}
                    title={`${m.fullLabel} 2026: ${formatRubles(m.revenue)} (${m.sessions} сессий, ${m.hours} ч)`}
                  >
                    <div className="month-card-top">
                      <strong>{m.shortLabel}</strong>
                      {m.isCurrentMonth && <span className="month-tag live-tag">СЕЙЧАС</span>}
                      {m.isFutureMonth && <span className="month-tag pre-tag">БРОНИ</span>}
                    </div>

                    <div className="month-bar-track" aria-hidden="true">
                      <div className="month-bar-fill" style={{ height: `${heightPct}%` }}>
                        <div
                          className="month-bar-vip"
                          style={{ height: `${vipPctOfMonth}%` }}
                        />
                      </div>
                    </div>

                    <div className="month-card-amount">{formatRubles(m.revenue)}</div>
                    <small className="month-card-meta">
                      {m.sessions} сес. · {m.hours} ч
                    </small>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live 10-PC Station Status & Quick Walk-in Reception Bar */}
          <div className="admin-live-section" aria-label="Табло состояния зала">
            <div className="admin-live-header">
              <h2>
                <Monitor size={16} className="lime" /> Табло зала прямо сейчас
              </h2>
              <span className="timezone">
                Нажмите на свободный ПК для быстрой посадки гостя с ресепшена
              </span>
            </div>

            <div className="admin-stations-grid">
              {dashboard.stations.map(({ pc, isVip, currentBooking, nextBooking }) => {
                const pcPad = String(pc).padStart(2, '0');
                const isBusyNow = Boolean(currentBooking);
                const isSelectedForWalkIn = !isBusyNow && walkInPc === pc;
                const isFilteredPc = searchQuery.toUpperCase() === `PC ${pcPad}`;

                return (
                  <button
                    key={pc}
                    type="button"
                    className={`admin-station-tile ${isVip ? 'vip-tile ' : ''}${
                      isBusyNow ? 'busy-tile ' : ''
                    }${isSelectedForWalkIn || isFilteredPc ? 'selected-tile' : ''}`}
                    onClick={() => {
                      if (isBusyNow) {
                        const targetFilter = `PC ${pcPad}`;
                        onSearchChange(searchQuery === targetFilter ? '' : targetFilter);
                      } else {
                        setWalkInPc(pc);
                        if (searchQuery) onSearchChange('');
                      }
                    }}
                    title={
                      currentBooking
                        ? `ПК ${pcPad}: ${currentBooking.name} (до ${formatSaratovTime(
                            currentBooking.end
                          )})`
                        : `ПК ${pcPad} свободен — выбрать для посадки`
                    }
                  >
                    <strong>
                      <span>PC {pcPad}</span>
                      {isVip && <Zap size={11} />}
                    </strong>
                    <small>
                      {currentBooking
                        ? `● до ${formatSaratovTime(currentBooking.end)}`
                        : nextBooking
                        ? `Своб. до ${formatSaratovTime(nextBooking.start)}`
                        : 'Свободен'}
                    </small>
                    <small>
                      {currentBooking
                        ? currentBooking.name
                        : isSelectedForWalkIn
                        ? '✓ ВЫБРАН'
                        : `${isVip ? 250 : 150} ₽/ч`}
                    </small>
                  </button>
                );
              })}
            </div>

            <div className="admin-walkin-specs">
              <Cpu size={13} className="lime" />
              <span>
                Посадка на <b>PC {String(walkInPc).padStart(2, '0')}</b> ({walkInSpecs.zoneTitle}):{' '}
                {walkInSpecs.gpu} · {walkInSpecs.cpu.split(' (')[0]} · {walkInSpecs.monitor}
              </span>
            </div>

            <form className="admin-walkin-form" onSubmit={handleWalkInSubmit}>
              <label>
                Компьютер
                <select
                  aria-label="ПК для быстрой посадки"
                  value={walkInPc}
                  onChange={(e) => setWalkInPc(Number(e.target.value))}
                >
                  {dashboard.stations.map(({ pc, isVip, currentBooking }) => (
                    <option key={pc} value={pc}>
                      PC {String(pc).padStart(2, '0')} ({isVip ? 'VIP' : 'Std'}) —{' '}
                      {currentBooking ? 'Занят' : 'Свободен'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Имя или ник гостя
                <input
                  aria-label="Имя гостя для быстрой посадки"
                  maxLength={40}
                  placeholder={`Гость ПК ${String(walkInPc).padStart(2, '0')}`}
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                />
              </label>

              <label>
                Старт сессии
                <select
                  aria-label="Время старта быстрой посадки"
                  value={walkInStartMode}
                  onChange={(e) => setWalkInStartMode(e.target.value as 'now' | 'next')}
                >
                  <option value="now">
                    Сейчас ({formatSaratovTime(currentHalfHour)})
                  </option>
                  <option value="next">
                    След. слот ({formatSaratovTime(nextHalfHour)})
                  </option>
                </select>
              </label>

              <label>
                Часы ({formatRubles(walkInPrice)})
                <select
                  aria-label="Длительность быстрой посадки"
                  value={walkInHours}
                  onChange={(e) => setWalkInHours(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((h) => (
                    <option key={h} value={h}>
                      {h} ч — {formatRubles(calculateTotal(walkInPc, h, walkInPromo))}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Скидка / Промо
                <select
                  aria-label="Скидка для быстрой посадки"
                  value={walkInPromo}
                  onChange={(e) => setWalkInPromo(e.target.value)}
                >
                  <option value="">Без скидки</option>
                  <option value="btmsh">BTMSH (−15%)</option>
                </select>
              </label>

              <button
                type="submit"
                className="primary"
                disabled={walkInSubmitting || loading}
              >
                {walkInSubmitting ? 'Сажаем…' : '+ Посадить гостя'}
              </button>
            </form>
          </div>
        </>
      )}

      <div className="record-tools">
        <div className="record-tools-left">
          <div className="tabs">
            {[
              ['active', `Предстоящие (${activeTabCount})`],
              ['past', `Архив (${pastTabCount})`],
              ['all', `Все (${monthScopedBookings.length})`],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={filterTab === val ? 'active' : ''}
                onClick={() => {
                  setVisibleLimit(40);
                  onFilterChange(val as FilterTab);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {isAdmin && selectedMonthObj && (
            <button
              type="button"
              className="month-filter-chip"
              onClick={() => setSelectedMonthKey(null)}
            >
              <span>
                Период: {selectedMonthObj.fullLabel} 2026 ({formatRubles(selectedMonthObj.revenue)})
              </span>
              <X size={13} />
            </button>
          )}
        </div>

        <input
          placeholder={
            isAdmin
              ? 'Поиск по нику, почте, PC 08 или #номеру'
              : 'Поиск по ПК, зоне или #номеру брони'
          }
          value={searchQuery}
          onChange={(e) => {
            setVisibleLimit(40);
            onSearchChange(e.target.value);
          }}
        />
      </div>

      {successMessage && (
        <p className="success-message" role="status">
          <Check size={16} />
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="error" role="alert">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <div className="empty">Загружаем записи…</div>
      ) : filteredBookings.length > 0 ? (
        <>
          <div className="booking-list">
            {visibleBookings.map((b) => {
              const isVip = isVipPc(b.pc);
              const liveState = getBookingLiveState(b, now);
              const isCancelled = liveState === 'cancelled';
              const isFinished = liveState === 'completed';
              const isInGame = liveState === 'in-game';
              const durationH = (b.end - b.start) / 3600000;
              const isExtendingThis = extendingId === b.id;

              return (
                <article key={b.id} className="booking-card">
                  <div className="booking-pc">
                    <Monitor />
                    <strong>PC {String(b.pc).padStart(2, '0')}</strong>
                    <small>{isVip ? 'VIP ROOM' : 'STANDARD'}</small>
                  </div>

                  <div className="booking-info">
                    <h3>{b.name}</h3>
                    <p>
                      {formatBookingTimeRange(b.start, b.end)} · {durationH} ч
                    </p>
                    {isAdmin && b.ownerEmail && (
                      <div className="booking-meta-line">
                        <UserRound size={11} style={{ display: 'inline', marginRight: 4 }} />
                        {b.ownerEmail}
                      </div>
                    )}
                    <code>#{b.id.slice(0, 8).toUpperCase()}</code>
                  </div>

                  <div>
                    <strong>{formatRubles(b.total)}</strong>
                    <p
                      className={`status ${
                        isCancelled ? 'cancelled' : isInGame ? 'in-game' : ''
                      }`}
                    >
                      {isCancelled
                        ? 'Отменена'
                        : isFinished
                        ? 'Завершена'
                        : isInGame
                        ? `● В игре (ещё ${formatRemainingTime(b.end, now)})`
                        : 'Ожидается'}
                    </p>
                  </div>

                  <div className="booking-actions">
                    {b.status === 'active' && !isFinished && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={isExtendingThis}
                        onClick={() => onExtendBooking(b, 1)}
                        title="Продлить сессию на 1 час"
                      >
                        <Clock3 size={15} />
                        {isExtendingThis ? 'Продлеваем…' : '+1 ч'}
                      </button>
                    )}

                    {!isAdmin && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onExportIcs(b)}
                      >
                        <Download size={15} />
                        В календарь
                      </button>
                    )}

                    {b.status === 'active' && !isFinished && (
                      <button
                        type="button"
                        className="cancel"
                        onClick={() => onCancelRequest(b)}
                      >
                        Отменить
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {filteredBookings.length > visibleLimit && (
            <div className="load-more-wrap">
              <button
                type="button"
                className="secondary"
                onClick={() => setVisibleLimit((prev) => prev + 60)}
              >
                Показать ещё записи (показано {visibleBookings.length} из{' '}
                {filteredBookings.length})
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <CalendarDays size={45} />
          <h3>Здесь пока тихо</h3>
          <p>
            {searchQuery
              ? `По запросу «${searchQuery}» записей не найдено.`
              : isAdmin
              ? 'Активных сессий в этой вкладке сейчас нет. Посадите гостя через панель выше или откройте архив.'
              : 'В этом разделе пока нет бронирований.'}
          </p>
          {searchQuery ? (
            <button
              type="button"
              className="secondary"
              onClick={() => onSearchChange('')}
            >
              Сбросить поиск
            </button>
          ) : isAdmin && selectedMonthKey ? (
            <button
              type="button"
              className="secondary"
              onClick={() => setSelectedMonthKey(null)}
            >
              Показать все месяцы 2026 года
            </button>
          ) : isAdmin && filterTab === 'active' && pastTabCount > 0 ? (
            <button
              type="button"
              className="secondary"
              onClick={() => onFilterChange('past')}
            >
              Открыть архив записей ({pastTabCount})
            </button>
          ) : !isAdmin ? (
            <button
              type="button"
              className="primary"
              onClick={onNavigateBooking}
            >
              Выбрать своё место <ArrowRight size={18} />
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
};
