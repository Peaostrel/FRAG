import React from 'react';
import { Monitor, Zap, ArrowUpRight, Cpu, HardDrive, Headphones, Gamepad2 } from 'lucide-react';
import { HARDWARE_SPECS } from '../utils/booking-logic.ts';
import type { TariffCategory } from '../types.ts';

interface TariffsProps {
  currentCategory: TariffCategory;
  selectedPc: number;
  onSelectCategory: (category: TariffCategory, defaultPc?: number) => void;
}

export const Tariffs: React.FC<TariffsProps> = ({
  currentCategory,
  selectedPc,
  onSelectCategory,
}) => {
  const std = HARDWARE_SPECS.standard;
  const vip = HARDWARE_SPECS.vip;
  const isVipSelected = selectedPc >= 7 && selectedPc <= 10;

  const handleChoose = (category: TariffCategory, defaultPc: number) => {
    onSelectCategory(category, defaultPc);
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="tariffs" id="tariffs" aria-label="Тарифы и комплектующие ПК">
      {/* STANDARD ZONE CARD */}
      <button
        type="button"
        className={`tariff tariff-detailed ${
          currentCategory === 'standard' || !isVipSelected ? 'chosen' : ''
        }`}
        onClick={() => handleChoose('standard', 1)}
      >
        <div className="tariff-top">
          <div className="tariff-icon">
            <Monitor />
          </div>
          <div>
            <div className="tiny">ДЛЯ УВЕРЕННОЙ ИГРЫ · {std.stationsLabel}</div>
            <h3>
              STANDARD <span>06 мест</span>
            </h3>
          </div>
          <div className="tariff-price">
            {std.rate} ₽<small>/ час</small>
          </div>
          <ArrowUpRight className="tariff-arrow" />
        </div>

        <div className="specs-grid">
          <div className="spec-item">
            <span className="spec-label">
              <Cpu size={12} /> Видеокарта
            </span>
            <strong>{std.gpu}</strong>
          </div>
          <div className="spec-item">
            <span className="spec-label">
              <Cpu size={12} /> Процессор
            </span>
            <strong>{std.cpu}</strong>
          </div>
          <div className="spec-item">
            <span className="spec-label">
              <HardDrive size={12} /> Память и SSD
            </span>
            <strong>
              {std.ram} · {std.storage}
            </strong>
          </div>
          <div className="spec-item">
            <span className="spec-label">
              <Monitor size={12} /> Монитор
            </span>
            <strong>{std.monitor}</strong>
          </div>
          <div className="spec-item spec-wide">
            <span className="spec-label">
              <Headphones size={12} /> Периферия и кресло
            </span>
            <strong>
              {std.mouse} · {std.keyboard} · {std.headset} · {std.chair}
            </strong>
          </div>
          <div className="spec-item spec-wide">
            <span className="spec-label">
              <Gamepad2 size={12} /> Игры и лаунчеры
            </span>
            <strong>{std.games}</strong>
          </div>
        </div>
      </button>

      {/* VIP ROOM CARD */}
      <button
        type="button"
        className={`tariff vip tariff-detailed ${
          currentCategory === 'vip' || isVipSelected ? 'chosen' : ''
        }`}
        onClick={() => handleChoose('vip', 7)}
      >
        <div className="tariff-top">
          <div className="tariff-icon">
            <Zap />
          </div>
          <div>
            <div className="tiny">КОГДА НУЖНО БОЛЬШЕ · {vip.stationsLabel}</div>
            <h3>
              VIP ROOM <span>04 места</span>
            </h3>
          </div>
          <div className="tariff-price">
            {vip.rate} ₽<small>/ час</small>
          </div>
          <ArrowUpRight className="tariff-arrow" />
        </div>

        <div className="specs-grid">
          <div className="spec-item">
            <span className="spec-label">
              <Cpu size={12} /> Видеокарта
            </span>
            <strong>{vip.gpu}</strong>
          </div>
          <div className="spec-item">
            <span className="spec-label">
              <Cpu size={12} /> Процессор
            </span>
            <strong>{vip.cpu}</strong>
          </div>
          <div className="spec-item">
            <span className="spec-label">
              <HardDrive size={12} /> Память и SSD
            </span>
            <strong>
              {vip.ram} · {vip.storage}
            </strong>
          </div>
          <div className="spec-item">
            <span className="spec-label">
              <Monitor size={12} /> Монитор
            </span>
            <strong>{vip.monitor}</strong>
          </div>
          <div className="spec-item spec-wide">
            <span className="spec-label">
              <Headphones size={12} /> Периферия и комфорт
            </span>
            <strong>
              {vip.mouse} · {vip.keyboard} · {vip.headset} · {vip.chair}
            </strong>
          </div>
          <div className="spec-item spec-wide">
            <span className="spec-label">
              <Gamepad2 size={12} /> Игры и лаунчеры
            </span>
            <strong>{vip.games}</strong>
          </div>
        </div>
      </button>
    </section>
  );
};
