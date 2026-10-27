import React from 'react';
import { ArrowUpRight, Zap, Monitor, Headphones } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow">
          <span /> ТВОЯ ТЕРРИТОРИЯ ИГРЫ <b>САРАТОВ · 24/7 · 10 ПК</b>
        </div>
        <h1>
          МЕНЬШЕ ЛАГОВ.
          <br />
          <span>БОЛЬШЕ ФРАГОВ.</span>
        </h1>
        <p>
          Мощное железо. Своя атмосфера. Твоя команда.
          <br />
          Всё готово — осталось занять своё место.
        </p>
        <a className="primary" href="#booking">
          Выбрать компьютер <ArrowUpRight size={21} />
        </a>
        <div className="hero-meta">
          <span>
            <Zap size={15} /> 1 Гбит/с
          </span>
          <span>
            <Monitor size={15} /> от 144 Гц
          </span>
          <span>
            <Headphones size={15} /> Полное погружение
          </span>
        </div>
      </div>

      <div className="hero-art" aria-label="Игровой компьютер FRAG">
        <div className="art-grid" />
        <span className="art-coordinate">FRAG SYSTEM / READY TO PLAY</span>
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="screen">
          <div className="screen-inner">
            <span className="screen-caption">NO LIMITS. JUST PLAY.</span>
            <strong>
              F<span>↗</span>
            </strong>
            <div className="screen-bottom">
              <span>
                PERFORMANCE
                <br />
                <b>100%</b>
              </span>
              <Monitor size={33} />
            </div>
          </div>
        </div>
        <div className="stand" />
        <div className="keyboard" />
        <div className="tower">
          <div className="fan" />
          <div className="fan" />
          <span>RTX / ON</span>
        </div>
        <div className="art-tag">
          <i /> ALL SYSTEMS ONLINE
        </div>
        <span className="art-index">// NEXT LEVEL EXPERIENCE</span>
      </div>
    </section>
  );
};
