import React from 'react';
import { Shield, UserRound, LogOut } from 'lucide-react';
import type { AuthIntent, User, ViewTab } from '../types.ts';

interface HeaderProps {
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab, scrollTargetId?: string) => void;
  currentUser: User | null;
  authLoading: boolean;
  onOpenAuth: (intended?: AuthIntent) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  authLoading,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header>
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('booking');
        }}
      >
        FRAG
        <span className="brand-cross">✳</span>
        <small>
          CYBER
          <br />
          LOUNGE
        </small>
      </a>

      <nav>
        <button
          type="button"
          className={currentTab === 'booking' ? 'nav-active' : ''}
          onClick={() => onNavigate('booking')}
        >
          Бронирование
        </button>
        <a
          href="#tariffs"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('booking', 'tariffs');
          }}
        >
          Тарифы
        </a>
        <button
          type="button"
          className={currentTab === 'history' ? 'nav-active' : ''}
          onClick={() => onNavigate('history')}
        >
          Мои брони
        </button>
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            className={currentTab === 'admin' ? 'nav-active' : ''}
            onClick={() => onNavigate('admin')}
          >
            Админка
          </button>
        )}
      </nav>

      <div className="header-right">
        <span className="online">
          <i /> Клуб открыт 24/7
        </span>

        {currentUser?.role === 'admin' && (
          <button
            type="button"
            className={`icon-btn ${currentTab === 'admin' ? 'active' : ''}`}
            aria-label="Администратор"
            title="Панель администратора"
            onClick={() => onNavigate('admin')}
          >
            <Shield size={19} />
          </button>
        )}

        {currentUser ? (
          <>
            <button
              type="button"
              className="account-button"
              onClick={() =>
                onNavigate(currentUser.role === 'admin' ? 'admin' : 'history')
              }
            >
              <UserRound size={16} />
              <span>{currentUser.name}</span>
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Выйти из аккаунта"
              title="Выйти"
              onClick={onLogout}
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="account-button"
            disabled={authLoading}
            onClick={() => onOpenAuth('booking')}
          >
            <UserRound size={16} />
            {authLoading ? 'Проверяем вход…' : 'Войти'}
          </button>
        )}
      </div>
    </header>
  );
};
