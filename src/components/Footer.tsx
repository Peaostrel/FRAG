import React from 'react';
import { CLUB_ADDRESS, CLUB_PHONE } from '../utils/booking-logic.ts';

interface FooterProps {
  onNavigateHome: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateHome }) => {
  return (
    <footer>
      <a
        href="#"
        className="brand"
        onClick={(e) => {
          e.preventDefault();
          onNavigateHome();
        }}
      >
        FRAG<span className="brand-cross">✳</span>
      </a>
      <span>
        {CLUB_ADDRESS.toUpperCase()} · {CLUB_PHONE} · 24/7
      </span>
      <small>© {new Date().getFullYear()} FRAG / Cyber Lounge · Саратов</small>
    </footer>
  );
};
