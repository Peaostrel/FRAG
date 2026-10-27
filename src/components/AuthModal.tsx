import React, { useState, useEffect } from 'react';
import { UserRound, ArrowRight, X } from 'lucide-react';
import type { AuthMode } from '../types.ts';

interface AuthModalProps {
  initialMode?: AuthMode;
  initialName?: string;
  isBookingFlow?: boolean;
  loading: boolean;
  errorMessage: string;
  onClearError: () => void;
  onClose: () => void;
  onSubmit: (data: {
    action: AuthMode;
    email: string;
    password: string;
    name?: string;
    adminCode?: string;
  }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'login',
  initialName = '',
  isBookingFlow = false,
  loading,
  errorMessage,
  onClearError,
  onClose,
  onSubmit,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(initialName);
  const [adminCode, setAdminCode] = useState('');

  useEffect(() => {
    if (initialName && !name) {
      setName(initialName);
    }
  }, [initialName]);

  const handleModeSwitch = (nextMode: AuthMode) => {
    setMode(nextMode);
    onClearError();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      action: mode,
      email,
      password,
      name: mode === 'register' ? name : undefined,
      adminCode: mode === 'register' ? adminCode : undefined,
    });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <section
        className="modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !loading) {
            e.preventDefault();
            onClose();
          }
        }}
      >
        <button
          type="button"
          className="modal-close icon-btn"
          aria-label="Закрыть"
          disabled={loading}
          onClick={onClose}
        >
          <X />
        </button>

        <UserRound size={30} className="lime" />
        <h2>{mode === 'login' ? 'С возвращением.' : 'Твой первый GG.'}</h2>
        <p>
          {isBookingFlow
            ? mode === 'login'
              ? 'После входа выбранный компьютер сразу закрепится за тобой.'
              : 'После регистрации выбранный компьютер сразу закрепится за тобой.'
            : mode === 'login'
            ? 'Войди, чтобы бронировать и управлять записями.'
            : 'Создай аккаунт — и забери своё место в игре.'}
        </p>

        <div className="tabs auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => handleModeSwitch('login')}
          >
            Вход
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => handleModeSwitch('register')}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Игровой ник
              <input
                required
                minLength={2}
                maxLength={40}
                autoComplete="nickname"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) onClearError();
                }}
                placeholder="Твой ник в клубе"
              />
            </label>
          )}

          <label>
            Электронная почта
            <input
              autoFocus
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) onClearError();
              }}
              placeholder="player@example.com"
            />
          </label>

          <label>
            Пароль
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) onClearError();
              }}
              placeholder="Не меньше 8 символов"
            />
          </label>

          {mode === 'register' && (
            <details className="admin-code">
              <summary>Я администратор клуба</summary>
              <label>
                Код владельца
                <input
                  type="password"
                  autoComplete="off"
                  maxLength={128}
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Код для создания администратора"
                />
              </label>
              <p>Для обычного игрока это поле не требуется.</p>
            </details>
          )}

          {errorMessage && (
            <div className="error" role="alert">
              {errorMessage}
            </div>
          )}

          <button type="submit" className="primary" disabled={loading}>
            {loading
              ? 'Подождите…'
              : isBookingFlow
              ? mode === 'login'
                ? 'Войти и забронировать'
                : 'Создать аккаунт и забронировать'
              : mode === 'login'
              ? 'Войти в аккаунт'
              : 'Создать аккаунт'}
            <ArrowRight size={18} />
          </button>

          <p className="auth-note">
            {mode === 'register'
              ? 'Запомни пароль: восстановление по почте пока не подключено.'
              : 'Твои брони доступны с любого устройства после входа.'}
          </p>
        </form>
      </section>
    </div>
  );
};
