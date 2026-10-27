import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import { Tariffs } from './components/Tariffs.tsx';
import { BookingForm } from './components/BookingForm.tsx';
import { BottomFeatures } from './components/BottomFeatures.tsx';
import { RecordsView } from './components/RecordsView.tsx';
import { TicketModal } from './components/TicketModal.tsx';
import { CancelModal } from './components/CancelModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { Footer } from './components/Footer.tsx';
import {
  generateIcsCalendar,
  getInitialSlot,
  isSlotInPast,
  findFirstAvailablePc,
  isVipPc,
  formatSaratovTime,
} from './utils/booking-logic.ts';
import type {
  AuthIntent,
  AuthMode,
  Booking,
  FilterTab,
  OccupiedSlot,
  TariffCategory,
  User,
  ViewTab,
} from './types.ts';

const TOKEN_STORAGE_KEY = 'frag_session_token';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted modes
  }
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('booking');
  const [tariffCategory, setTariffCategory] = useState<TariffCategory>('all');
  const [selectedPc, setSelectedPc] = useState<number>(1);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('');
  const [durationHours, setDurationHours] = useState<number>(2);
  const [clientName, setClientName] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');

  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);
  const [isAvailabilityLoaded, setIsAvailabilityLoaded] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<string>('');

  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>('booking');
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string>('');
  const [recordSuccessMsg, setRecordSuccessMsg] = useState<string>('');

  const userManuallyPickedPcRef = useRef<boolean>(false);

  // Initial slot calculation
  useEffect(() => {
    const slot = getInitialSlot();
    setBookingDate(slot.date);
    setBookingTime(slot.time);
  }, []);

  // Generic API caller with unified error handling and iframe-safe session token fallback
  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      const storedToken = getStoredToken();
      if (storedToken) {
        headers.set('x-frag-token', storedToken);
      }

      const res = await fetch(url, {
        ...options,
        headers,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401 && !url.startsWith('/api/auth')) {
          setStoredToken(null);
          setCurrentUser(null);
          setBookingsList([]);
          setConfirmedBooking(null);
          setAuthIntent(currentTab === 'history' ? 'history' : 'booking');
          setIsAuthOpen(true);
        }
        throw new Error(data.error || 'Не удалось выполнить запрос');
      }
      return data;
    },
    [currentTab]
  );

  // Check auth status on mount
  useEffect(() => {
    let active = true;
    const headers: Record<string, string> = {};
    const storedToken = getStoredToken();
    if (storedToken) {
      headers['x-frag-token'] = storedToken;
    }

    fetch('/api/auth', { headers })
      .then(async (res) => {
        if (!res.ok) throw new Error('Не удалось проверить сессию');
        return res.json();
      })
      .then((data) => {
        if (active) {
          setCurrentUser(data.user);
          if (data.user?.name) {
            setClientName(data.user.name);
          }
        }
      })
      .catch(() => {
        // Guest session
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Calculate start & end timestamps in Saratov timezone (UTC+4)
  const startTimestamp = Date.parse(`${bookingDate}T${bookingTime}:00+04:00`);
  const endTimestamp = startTimestamp + durationHours * 3600000;
  const occupiedPcs = Array.from(new Set(occupiedSlots.map((s) => s.pc)));

  // Fetch PC availability whenever slot or refreshKey changes
  useEffect(() => {
    if (!Number.isFinite(startTimestamp)) return;

    let active = true;
    setIsAvailabilityLoaded(false);
    setGlobalError('');

    const controller = new AbortController();
    apiFetch(`/api/bookings?availability=1&start=${startTimestamp}&end=${endTimestamp}`, {
      signal: controller.signal,
    })
      .then((data: Array<{ pc: number; start?: number; end?: number }>) => {
        if (!active) return;
        const normalized: OccupiedSlot[] = data.map((item) => ({
          pc: item.pc,
          start: item.start ?? startTimestamp,
          end: item.end ?? endTimestamp,
        }));
        setOccupiedSlots(normalized);
        setIsAvailabilityLoaded(true);

        const takenList = normalized.map((item) => item.pc);
        if (!userManuallyPickedPcRef.current && takenList.includes(selectedPc)) {
          const freePc =
            findFirstAvailablePc(tariffCategory, takenList) ??
            findFirstAvailablePc('all', takenList);
          if (freePc !== null) {
            setSelectedPc(freePc);
          }
        }
      })
      .catch((err: any) => {
        if (active && err.name !== 'AbortError') {
          setGlobalError(err.message);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [startTimestamp, endTimestamp, refreshKey, apiFetch]);

  // Synchronize zone category & selected PC
  const handleCategoryChange = useCallback(
    (category: TariffCategory, explicitPc?: number) => {
      setTariffCategory(category);
      if (explicitPc !== undefined) {
        const freeInZone = findFirstAvailablePc(category, occupiedPcs);
        setSelectedPc(
          occupiedPcs.includes(explicitPc) && freeInZone !== null ? freeInZone : explicitPc
        );
        return;
      }
      if (category === 'vip' && !isVipPc(selectedPc)) {
        setSelectedPc(findFirstAvailablePc('vip', occupiedPcs) ?? 7);
      } else if (category === 'standard' && isVipPc(selectedPc)) {
        setSelectedPc(findFirstAvailablePc('standard', occupiedPcs) ?? 1);
      }
    },
    [occupiedPcs, selectedPc]
  );

  // Handle date change and prevent past time selection when switching back to today
  const handleDateChange = useCallback(
    (newDate: string) => {
      setBookingDate(newDate);
      if (isSlotInPast(newDate, bookingTime)) {
        const nextSlot = getInitialSlot();
        setBookingTime(nextSlot.time);
      }
    },
    [bookingTime]
  );

  // Load user or admin bookings
  const loadBookings = useCallback(
    async (isAdminMode: boolean, silent: boolean = false) => {
      if (!silent) {
        setIsBusy(true);
        setGlobalError('');
      }
      try {
        const query = isAdminMode ? '?admin=1' : '';
        const list = await apiFetch(`/api/bookings${query}`);
        setBookingsList(list);
      } catch (err: any) {
        if (!silent) setGlobalError(err.message);
      } finally {
        if (!silent) setIsBusy(false);
      }
    },
    [apiFetch]
  );

  // Auto-refresh bookings every 20s while in Admin Control Center
  useEffect(() => {
    if (currentTab !== 'admin' || !currentUser || currentUser.role !== 'admin') return;
    const timer = setInterval(() => {
      loadBookings(true, true);
    }, 20000);
    return () => clearInterval(timer);
  }, [currentTab, currentUser, loadBookings]);

  // Navigation router with optional smooth scroll to section
  const handleNavigate = useCallback(
    async (tab: ViewTab, scrollTargetId?: string) => {
      if (tab === 'history' && !currentUser) {
        setAuthIntent('history');
        setIsAuthOpen(true);
        return;
      }
      setCurrentTab(tab);
      setGlobalError('');
      setRecordSuccessMsg('');
      if (tab === 'history' || tab === 'admin') {
        await loadBookings(tab === 'admin');
      } else if (scrollTargetId) {
        setTimeout(() => {
          document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth' });
        }, 40);
      }
    },
    [currentUser, loadBookings]
  );

  // Core booking execution helper
  const executeBooking = async (nameToUse: string) => {
    setIsBusy(true);
    setGlobalError('');
    try {
      let effectiveStart = startTimestamp;
      if (effectiveStart < Date.now() - 4 * 60 * 1000) {
        const freshSlot = getInitialSlot();
        setBookingDate(freshSlot.date);
        setBookingTime(freshSlot.time);
        effectiveStart = Date.parse(`${freshSlot.date}T${freshSlot.time}:00+04:00`);
      }

      const newBooking = await apiFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameToUse,
          pc: selectedPc,
          start: effectiveStart,
          hours: durationHours,
          promo: promoCode,
        }),
      });

      setConfirmedBooking(newBooking);
      setRefreshKey(crypto.randomUUID());
    } catch (err: any) {
      setGlobalError(err.message);
      setRefreshKey(crypto.randomUUID());
    } finally {
      setIsBusy(false);
    }
  };

  // Auth submission (login / register)
  const handleAuthSubmit = async (data: {
    action: AuthMode;
    email: string;
    password: string;
    name?: string;
    adminCode?: string;
  }) => {
    setAuthSubmitting(true);
    setAuthError('');
    try {
      const res = await apiFetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.token) {
        setStoredToken(res.token);
      }
      const loggedUser: User = res.user;
      setCurrentUser(loggedUser);
      const resolvedName = clientName.trim().length >= 2 ? clientName.trim() : loggedUser.name;
      setClientName(resolvedName);
      setIsAuthOpen(false);
      setGlobalError('');

      if (authIntent === 'submit-booking') {
        await executeBooking(resolvedName);
      } else if (loggedUser.role === 'admin') {
        setCurrentTab('admin');
        await loadBookings(true);
      } else if (authIntent === 'history') {
        setCurrentTab('history');
        await loadBookings(false);
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      setStoredToken(null);
      setCurrentUser(null);
      setBookingsList([]);
      setCurrentTab('booking');
      setConfirmedBooking(null);
      setCancelTarget(null);
      setRecordSuccessMsg('');
      setGlobalError('');
    } catch (err: any) {
      setGlobalError(err.message);
    }
  };

  // Booking form submit handler
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    if (!isAvailabilityLoaded) {
      setGlobalError('Дождитесь проверки свободных мест');
      return;
    }

    if (occupiedPcs.includes(selectedPc)) {
      setGlobalError('Этот компьютер уже занят на выбранное время. Выберите другое место.');
      return;
    }

    if (!currentUser) {
      setAuthIntent('submit-booking');
      setAuthError('');
      setIsAuthOpen(true);
      return;
    }

    const effectiveName = clientName.trim() || currentUser.name;
    await executeBooking(effectiveName);
  };

  // Quick Walk-in handler from Admin Control Center
  const handleQuickWalkIn = async (data: {
    pc: number;
    name: string;
    hours: number;
    start: number;
    promo?: string;
  }): Promise<boolean> => {
    setGlobalError('');
    setRecordSuccessMsg('');
    try {
      const createdBooking: Booking = await apiFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          walkIn: true,
        }),
      });

      setBookingsList((prev) => [createdBooking, ...prev]);
      const pcPad = String(createdBooking.pc).padStart(2, '0');
      setRecordSuccessMsg(
        `Гость «${createdBooking.name}» посажен за ПК ${pcPad} (до ${formatSaratovTime(
          createdBooking.end
        )}).`
      );
      setFilterTab('active');
      setRefreshKey(crypto.randomUUID());
      return true;
    } catch (err: any) {
      setGlobalError(err.message);
      return false;
    }
  };

  // Extend booking (+1 hour) handler
  const handleExtendBooking = async (booking: Booking, addHours: number = 1) => {
    setExtendingId(booking.id);
    setGlobalError('');
    setRecordSuccessMsg('');
    try {
      const updated: Booking = await apiFetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id, addHours }),
      });

      setBookingsList((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, end: updated.end, total: updated.total } : b
        )
      );
      const pcPad = String(booking.pc).padStart(2, '0');
      setRecordSuccessMsg(
        `Сессия ПК ${pcPad} («${booking.name}») продлена на +${addHours} ч — до ${formatSaratovTime(
          updated.end
        )}.`
      );
      setRefreshKey(crypto.randomUUID());
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setExtendingId(null);
    }
  };

  // Cancel booking handler
  const handleConfirmCancel = async () => {
    if (!cancelTarget || cancelling) return;
    setCancelling(true);
    setCancelError('');
    try {
      await apiFetch(`/api/bookings?id=${encodeURIComponent(cancelTarget.id)}`, {
        method: 'DELETE',
      });

      setBookingsList((prev) =>
        prev.map((b) => (b.id === cancelTarget.id ? { ...b, status: 'cancelled' } : b))
      );
      const cancelledPcFormatted = String(cancelTarget.pc).padStart(2, '0');
      setRecordSuccessMsg(
        `Бронь ПК ${cancelledPcFormatted} отменена. Место снова доступно для бронирования.`
      );
      setCancelTarget(null);
      setRefreshKey(crypto.randomUUID());
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  // Download .ics calendar event
  const handleExportIcs = (booking: Booking) => {
    const icsContent = generateIcsCalendar(booking);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frag-booking-pc${booking.pc}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        authLoading={authLoading}
        onOpenAuth={(intended) => {
          setAuthIntent(intended || 'booking');
          setIsAuthOpen(true);
          setAuthError('');
        }}
        onLogout={handleLogout}
      />

      <main>
        {currentTab === 'booking' ? (
          <>
            <Hero />
            <Tariffs
              currentCategory={tariffCategory}
              selectedPc={selectedPc}
              onSelectCategory={(cat, defaultPc) => {
                handleCategoryChange(cat, defaultPc);
              }}
            />
            <BookingForm
              currentCategory={tariffCategory}
              onCategoryChange={(cat) => handleCategoryChange(cat)}
              selectedPc={selectedPc}
              onSelectPc={(pc) => {
                userManuallyPickedPcRef.current = true;
                setSelectedPc(pc);
              }}
              bookingDate={bookingDate}
              onDateChange={handleDateChange}
              bookingTime={bookingTime}
              onTimeChange={setBookingTime}
              durationHours={durationHours}
              onDurationChange={setDurationHours}
              clientName={clientName}
              onNameChange={setClientName}
              promoCode={promoCode}
              onPromoChange={setPromoCode}
              occupiedSlots={occupiedSlots}
              isAvailabilityLoaded={isAvailabilityLoaded}
              currentUser={currentUser}
              submitting={isBusy}
              errorMessage={globalError}
              onSubmit={handleBookingSubmit}
            />
            <BottomFeatures />
          </>
        ) : (
          <RecordsView
            currentTab={currentTab}
            currentUser={currentUser}
            bookings={bookingsList}
            loading={isBusy}
            extendingId={extendingId}
            filterTab={filterTab}
            onFilterChange={setFilterTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            successMessage={recordSuccessMsg}
            errorMessage={globalError}
            onRefresh={() => loadBookings(currentTab === 'admin')}
            onCancelRequest={(booking) => {
              setCancelError('');
              setCancelTarget(booking);
              setRecordSuccessMsg('');
            }}
            onExtendBooking={handleExtendBooking}
            onQuickWalkIn={handleQuickWalkIn}
            onExportIcs={handleExportIcs}
            onNavigateBooking={() => handleNavigate('booking')}
          />
        )}
      </main>

      <Footer onNavigateHome={() => handleNavigate('booking')} />

      {/* Confirmed booking modal */}
      {confirmedBooking && (
        <TicketModal
          booking={confirmedBooking}
          onClose={() => setConfirmedBooking(null)}
          onExportIcs={handleExportIcs}
          onViewBookings={() => {
            setConfirmedBooking(null);
            handleNavigate('history');
          }}
        />
      )}

      {/* Cancellation confirmation modal */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          loading={cancelling}
          errorMessage={cancelError}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleConfirmCancel}
        />
      )}

      {/* Auth modal */}
      {isAuthOpen && (
        <AuthModal
          initialName={clientName}
          isBookingFlow={authIntent === 'submit-booking'}
          loading={authSubmitting}
          errorMessage={authError}
          onClearError={() => setAuthError('')}
          onClose={() => {
            setIsAuthOpen(false);
            setAuthError('');
          }}
          onSubmit={handleAuthSubmit}
        />
      )}
    </>
  );
}
