import React from 'react';
import { Monitor, Zap, Shield } from 'lucide-react';
import { getPcOccupancyBadge } from '../utils/booking-logic.ts';
import type { OccupiedSlot, TariffCategory } from '../types.ts';

interface FloorPlanProps {
  currentCategory: TariffCategory;
  onCategoryChange: (category: TariffCategory) => void;
  selectedPc: number;
  onSelectPc: (pc: number) => void;
  occupiedSlots: OccupiedSlot[];
  startTimestamp: number;
  endTimestamp: number;
  isAvailabilityLoaded: boolean;
}

export const FloorPlan: React.FC<FloorPlanProps> = ({
  currentCategory,
  onCategoryChange,
  selectedPc,
  onSelectPc,
  occupiedSlots,
  startTimestamp,
  endTimestamp,
  isAvailabilityLoaded,
}) => {
  const renderPcButton = (pc: number, isVip: boolean) => {
    const badge = getPcOccupancyBadge(pc, startTimestamp, endTimestamp, occupiedSlots);
    const isTaken = badge.isTaken;
    const isSelected = selectedPc === pc && !isTaken;

    return (
      <button
        key={pc}
        type="button"
        disabled={!isAvailabilityLoaded || isTaken}
        onClick={() => onSelectPc(pc)}
        className={`pc ${isVip ? 'vip-pc ' : ''}${isSelected ? 'selected ' : ''}${
          isTaken ? 'taken' : ''
        }`}
        aria-label={`${isVip ? 'VIP ' : ''}ПК ${pc} ${
          isTaken ? badge.label.toLowerCase() : 'свободен'
        }`}
        aria-pressed={isSelected}
      >
        <Monitor size={27} />
        <span>PC {String(pc).padStart(2, '0')}</span>
        <small>{isTaken ? badge.label : isSelected ? 'ТВОЙ ВЫБОР' : badge.label}</small>
      </button>
    );
  };

  return (
    <div className="panel map-panel">
      <div className="panel-title">
        <span className="number">02</span>
        <h3>Выбери свой сетап</h3>
        <span className="map-live">
          <i />
          {isAvailabilityLoaded ? 'Доступность проверена' : 'Проверяем места…'}
        </span>
      </div>

      <div className="map-toolbar">
        <div className="tabs">
          {[
            ['all', 'Весь клуб'],
            ['standard', 'Standard'],
            ['vip', 'VIP Room'],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={currentCategory === val ? 'active' : ''}
              onClick={() => onCategoryChange(val as TariffCategory)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="legend">
          <span>
            <i />
            Свободно
          </span>
          <span>
            <i className="occupied" />
            Занято
          </span>
          <span>
            <i className="selected" />
            Выбрано
          </span>
        </div>
      </div>

      <div className={`floor-plan zone-${currentCategory}`}>
        <div className="floor-lobby">
          <span>FRAG / FLOOR 01</span>
          <span>ВХОД →</span>
        </div>

        {currentCategory !== 'vip' && (
          <div className="standard-room">
            <div className="room-label">
              STANDARD ZONE <small>6 СТАНЦИЙ</small>
            </div>
            <div className="pc-grid">
              {[1, 2, 3, 4, 5, 6].map((pc) => renderPcButton(pc, false))}
            </div>
          </div>
        )}

        {currentCategory !== 'standard' && (
          <div className="vip-room">
            <div className="room-label">
              VIP ROOM <Zap size={13} />
            </div>
            <div className="pc-grid">
              {[7, 8, 9, 10].map((pc) => renderPcButton(pc, true))}
            </div>
          </div>
        )}

        <div className="floor-bottom">
          <span>← ЗОНА ОТДЫХА (ДИВАНЫ · НАПИТКИ · БЕЗ БРОНИ)</span>
          <span>● РЕСЕПШН И КАССА</span>
        </div>
      </div>

      <p className="map-note">
        <Shield size={14} /> Место закрепляется сразу после брони. Для всех гостей клуба работает
        бесплатная лаунж-зона с диванами и напитками.
      </p>
    </div>
  );
};
