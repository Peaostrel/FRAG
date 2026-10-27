import React from 'react';
import { Cpu, Gamepad2, Clock3 } from 'lucide-react';
import { CLUB_SHORT_ADDRESS } from '../utils/booking-logic.ts';

export const BottomFeatures: React.FC = () => {
  return (
    <section className="bottom-features">
      <div>
        <Cpu />
        <strong>Железо, которое тащит</strong>
        <p>RTX 3060 и RTX 4070 Super, NVMe SSD, мониторы 144–240 Гц и канал 1 Гбит/с</p>
      </div>
      <div>
        <Gamepad2 />
        <strong>Твоя игра уже здесь</strong>
        <p>Steam, FACEIT, Riot, Battle.net, Epic · CS2, Dota 2, Valorant, PUBG, Apex, GTA V</p>
      </div>
      <div>
        <Clock3 />
        <strong>24/7 + Лаунж-зона отдыха</strong>
        <p>{CLUB_SHORT_ADDRESS} · бесплатная зона с диванами и напитками для гостей</p>
      </div>
    </section>
  );
};
