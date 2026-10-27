import React from 'react';
import { CalendarDays, X } from 'lucide-react';
import { formatBookingDateTime } from '../utils/booking-logic.ts';
import type { Booking } from '../types.ts';

interface CancelModalProps {
  booking: Booking;
  loading: boolean;
  errorMessage: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  booking,
  loading,
  errorMessage,
  onClose,
  onConfirm,
}) => {
  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <section
        className="modal cancel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        aria-describedby="cancel-description"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !loading) {
            e.preventDefault();
            onClose();
          }
          if (e.key === 'Tab') {
            const buttons = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
            );
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <button
          type="button"
          className="modal-close icon-btn"
          aria-label="Закрыть подтверждение отмены"
          disabled={loading}
          onClick={onClose}
        >
          <X />
        </button>

        <CalendarDays size={30} className="lime" />
        <h2 id="cancel-title">Отменить бронь?</h2>
        <p id="cancel-description">
          ПК {String(booking.pc).padStart(2, '0')} · {formatBookingDateTime(booking.start)}. После
          отмены место станет доступно другим игрокам.
        </p>

        {errorMessage && (
          <div className="error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="cancel-dialog-actions">
          <button
            type="button"
            autoFocus
            className="secondary"
            disabled={loading}
            onClick={onClose}
          >
            Оставить бронь
          </button>
          <button
            type="button"
            className="primary"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Отменяем…' : 'Да, отменить'}
            <X size={17} />
          </button>
        </div>
      </section>
    </div>
  );
};
