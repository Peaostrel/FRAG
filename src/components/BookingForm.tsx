import React, { useState } from 'react';
import { CalendarDays, Clock3, Monitor, Check, ArrowUpRight, X, Cpu } from 'lucide-react';
import { FloorPlan } from './FloorPlan.tsx';
import {
  calculateTotal,
  formatRubles,
  formatBookingTimeRange,
  isValidPromo,
  getPcRate,
  isVipPc,
  getPcSpecs,
  getTimeSlotsForDate,
  getSaratovTodayDate,
  findFirstAvailablePc,
  getPcOccupancyBadge,
  SARATOV_OFFSET_MS,
  CLUB_SHORT_ADDRESS,
} from '../utils/booking-logic.ts';
import type { OccupiedSlot, TariffCategory, User } from '../types.ts';

interface BookingFormProps {
  currentCategory: TariffCategory;
  onCategoryChange: (cat: TariffCategory) => void;
  selectedPc: number;
  onSelectPc: (pc: number) => void;
  bookingDate: string;
  onDateChange: (date: string) => void;
  bookingTime: string;
  onTimeChange: (time: string) => void;
  durationHours: number;
  onDurationChange: (hours: number) => void;
  clientName: string;
  onNameChange: (name: string) => void;
  promoCode: string;
  onPromoChange: (promo: string) => void;
  occupiedSlots: OccupiedSlot[];
  isAvailabilityLoaded: boolean;
  currentUser: User | null;
  submitting: boolean;
  errorMessage: string;
  onSubmit: (e: React.FormEvent) => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  currentCategory,
  onCategoryChange,
  selectedPc,
  onSelectPc,
  bookingDate,
  onDateChange,
  bookingTime,
  onTimeChange,
  durationHours,
  onDurationChange,
  clientName,
  onNameChange,
  promoCode,
  onPromoChange,
  occupiedSlots,
  isAvailabilityLoaded,
  currentUser,
  submitting,
  errorMessage,
  onSubmit,
}) => {
  const [promoBlurred, setPromoBlurred] = useState(false);

  const startTimestamp = Date.parse(`${bookingDate}T${bookingTime}:00+04:00`);
  const endTimestamp = startTimestamp + durationHours * 3600000;
  const isPromoValid = isValidPromo(promoCode);
  const totalAmount = calculateTotal(selectedPc, durationHours, promoCode);
  const pcRate = getPcRate(selectedPc);
  const isVip = isVipPc(selectedPc);
  const specs = getPcSpecs(selectedPc);

  const occupiedPcs = Array.from(new Set(occupiedSlots.map((s) => s.pc)));
  const isPcOccupied = occupiedPcs.includes(selectedPc);
  const selectedPcBadge = getPcOccupancyBadge(
    selectedPc,
    startTimestamp,
    endTimestamp,
    occupiedSlots
  );
  const alternativeFreePc = isPcOccupied
    ? findFirstAvailablePc(currentCategory, occupiedPcs) ??
      findFirstAvailablePc('all', occupiedPcs)
    : null;

  const minDate = getSaratovTodayDate();
  const maxDate = new Date(Date.now() + 90 * 86400000 + SARATOV_OFFSET_MS)
    .toISOString()
    .slice(0, 10);

  const timeSlots = getTimeSlotsForDate(bookingDate);
  const showPromoFeedback =
    promoCode.trim().length > 0 &&
    (isPromoValid || promoBlurred || promoCode.trim().length >= 5);

  return (
    <section id="booking" className="booking-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow muted">ТВОЙ СЛЕДУЮЩИЙ GG</div>
          <h2>
            Забери своё место<span>↘</span>
          </h2>
        </div>
        <span className="step-label">01 — ВЫБОР · 02 — БРОНЬ · 03 — ИГРА</span>
      </div>

      <form onSubmit={onSubmit}>
        <div className="booking-main">
          {/* 01 Time panel */}
          <div className="panel time-panel">
            <div className="panel-title">
              <span className="number">01</span>
              <h3>Когда играем?</h3>
              <span className="timezone">{CLUB_SHORT_ADDRESS} · UTC+4</span>
            </div>

            <div className="time-inputs">
              <label>
                Дата
                <div className="input-wrap">
                  <CalendarDays size={17} />
                  <input
                    aria-label="Дата бронирования"
                    type="date"
                    required
                    min={minDate}
                    max={maxDate}
                    value={bookingDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        onDateChange(e.target.value);
                      }
                    }}
                  />
                </div>
              </label>

              <label>
                Начало
                <div className="input-wrap">
                  <Clock3 size={17} />
                  <select
                    aria-label="Время начала"
                    value={bookingTime}
                    onChange={(e) => onTimeChange(e.target.value)}
                  >
                    {timeSlots.map(({ value, disabled }) => (
                      <option key={value} value={value} disabled={disabled}>
                        {disabled ? `${value} (прошло)` : value}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label>
                Длительность
                <div className="duration">
                  <button
                    type="button"
                    aria-label="Уменьшить длительность"
                    disabled={durationHours <= 1}
                    onClick={() => onDurationChange(durationHours - 1)}
                  >
                    −
                  </button>
                  <span>{durationHours} ч</span>
                  <button
                    type="button"
                    aria-label="Увеличить длительность"
                    disabled={durationHours >= 12}
                    onClick={() => onDurationChange(durationHours + 1)}
                  >
                    +
                  </button>
                </div>
              </label>
            </div>
          </div>

          {/* 02 Floor plan */}
          <FloorPlan
            currentCategory={currentCategory}
            onCategoryChange={onCategoryChange}
            selectedPc={selectedPc}
            onSelectPc={onSelectPc}
            occupiedSlots={occupiedSlots}
            startTimestamp={startTimestamp}
            endTimestamp={endTimestamp}
            isAvailabilityLoaded={isAvailabilityLoaded}
          />
        </div>

        {/* 03 Summary sidebar */}
        <aside className="panel summary">
          <div className="panel-title">
            <span className="number">03</span>
            <h3>Твой игровой план</h3>
          </div>

          <div className="selected-setup">
            <div className="setup-icon">
              <Monitor size={29} />
            </div>
            <div>
              <span className="tiny">
                {isVip ? 'VIP ROOM' : 'STANDARD ZONE'}
                {isPcOccupied ? ` · ${selectedPcBadge.label}` : ''}
              </span>
              <h3>Компьютер {String(selectedPc).padStart(2, '0')}</h3>
            </div>
            <span
              className="check-circle"
              title={isPcOccupied ? 'Место занято' : 'Место свободно'}
            >
              {isPcOccupied ? <X size={15} /> : <Check size={15} />}
            </span>
          </div>

          {/* Selected PC Hardware Summary Box */}
          <div className={`summary-specs ${isVip ? 'vip-specs' : ''}`}>
            <div className="summary-specs-title">
              <Cpu size={13} /> Комплектующие ПК {String(selectedPc).padStart(2, '0')}
            </div>
            <div className="summary-spec-row">
              <span>Видеокарта</span>
              <strong>{specs.gpu}</strong>
            </div>
            <div className="summary-spec-row">
              <span>Процессор</span>
              <strong>{specs.cpu}</strong>
            </div>
            <div className="summary-spec-row">
              <span>ОЗУ / SSD</span>
              <strong>
                {specs.ram.split(' (')[0]} · {specs.storage.split(' ')[0]} {specs.storage.split(' ')[1]} SSD
              </strong>
            </div>
            <div className="summary-spec-row">
              <span>Монитор</span>
              <strong>{specs.monitor}</strong>
            </div>
            <div className="summary-spec-row">
              <span>Девайсы</span>
              <strong>
                {specs.mouse.split(' (')[0]} · {specs.headset.split(' /')[0]}
              </strong>
            </div>
            <div className="summary-spec-row">
              <span>Игры</span>
              <strong>CS2, Dota 2, Valorant, PUBG, Apex, GTA V</strong>
            </div>
          </div>

          {isAvailabilityLoaded && isPcOccupied && (
            <div className="error" role="alert">
              <div>
                ПК {String(selectedPc).padStart(2, '0')} недоступен в этот слот (
                {selectedPcBadge.label.toLowerCase()}).
              </div>
              {alternativeFreePc !== null ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onSelectPc(alternativeFreePc)}
                >
                  Выбрать свободный PC {String(alternativeFreePc).padStart(2, '0')} →
                </button>
              ) : (
                <div>В это время все ПК заняты — выберите другое время начала.</div>
              )}
            </div>
          )}

          <div className="receipt-row">
            <span>Дата и время</span>
            <strong>{formatBookingTimeRange(startTimestamp, endTimestamp)}</strong>
          </div>

          <div className="receipt-row">
            <span>Длительность</span>
            <strong>{durationHours} ч</strong>
          </div>

          <div className="receipt-row">
            <span>Тариф</span>
            <strong>{pcRate} ₽ / час</strong>
          </div>

          <hr />

          <label className="name-label">
            Имя или игровой ник {!currentUser && <span>можно указать при входе</span>}
            <input
              required={Boolean(currentUser)}
              minLength={2}
              maxLength={40}
              placeholder="Как к тебе обращаться?"
              value={clientName}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </label>

          <label className="promo-label">
            Промокод <span>необязательно</span>
            <input
              maxLength={30}
              placeholder="Введите промокод"
              value={promoCode}
              onFocus={() => setPromoBlurred(false)}
              onBlur={() => setPromoBlurred(true)}
              onChange={(e) => onPromoChange(e.target.value)}
            />
          </label>

          {showPromoFeedback && (
            <div className={`promo-result ${isPromoValid ? 'valid' : ''}`}>
              {isPromoValid ? '✓ Скидка 15% активирована' : 'Промокод не найден'}
            </div>
          )}

          <div className="total">
            <div>
              <span>Итого к оплате</span>
              <small>Оплата в клубе · {CLUB_SHORT_ADDRESS}</small>
            </div>
            <strong>{formatRubles(totalAmount)}</strong>
          </div>

          {errorMessage && (
            <div className="error" role="alert">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="primary confirm"
            disabled={
              submitting ||
              !isAvailabilityLoaded ||
              isPcOccupied ||
              !Number.isFinite(startTimestamp)
            }
          >
            {submitting
              ? 'Сохраняем…'
              : currentUser
              ? 'Забронировать'
              : 'Войти и забронировать'}
            <ArrowUpRight size={21} />
          </button>

          <p className="fineprint">
            Без предоплаты. Отменить бронь можно
            <br />в разделе «Мои брони».
          </p>
        </aside>
      </form>
    </section>
  );
};
