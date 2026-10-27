import React from 'react';
import { Check, CalendarDays, ChevronRight, X } from 'lucide-react';
import {
  formatBookingTimeRange,
  formatRubles,
  isVipPc,
  CLUB_ADDRESS,
  CLUB_PHONE,
} from '../utils/booking-logic.ts';
import type { Booking } from '../types.ts';

interface TicketModalProps {
  booking: Booking;
  onClose: () => void;
  onExportIcs: (booking: Booking) => void;
  onViewBookings: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  booking,
  onClose,
  onExportIcs,
  onViewBookings,
}) => {
  const isVip = isVipPc(booking.pc);
  const durationH = (booking.end - booking.start) / 3600000;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal ticket"
        role="dialog"
        aria-modal="true"
        aria-label="Бронирование подтверждено"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      >
        <button
          type="button"
          autoFocus
          className="modal-close icon-btn"
          aria-label="Закрыть"
          onClick={onClose}
        >
          <X />
        </button>

        <div className="success-icon">
          <Check size={36} />
        </div>

        <div className="eyebrow">YOU'RE IN. LET'S PLAY.</div>
        <h2>Место твоё.</h2>
        <p>{booking.name}, увидимся в FRAG!</p>

        <div className="ticket-details">
          <strong>
            PC {String(booking.pc).padStart(2, '0')} / {isVip ? 'VIP' : 'STANDARD'}
          </strong>
          <span>
            {formatBookingTimeRange(booking.start, booking.end)} · {durationH} ч
          </span>
          <span>
            К оплате в клубе: <b>{formatRubles(booking.total)}</b>
          </span>
          <span>
            {CLUB_ADDRESS} · {CLUB_PHONE}
          </span>
          <code>#{booking.id.slice(0, 8).toUpperCase()}</code>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => onExportIcs(booking)}
        >
          Добавить в календарь <CalendarDays size={18} />
        </button>

        <button
          type="button"
          className="text-button"
          onClick={() => {
            onClose();
            onViewBookings();
          }}
        >
          Открыть мои брони <ChevronRight size={15} />
        </button>
      </section>
    </div>
  );
};
