export type UserRole = 'client' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type BookingStatus = 'active' | 'cancelled' | 'completed';
export type BookingLiveState = 'in-game' | 'upcoming' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  name: string;
  pc: number;
  start: number;
  end: number;
  total: number;
  status: BookingStatus;
  created?: number;
  ownerEmail?: string;
}

export interface OccupiedSlot {
  pc: number;
  start: number;
  end: number;
}

export type TariffCategory = 'all' | 'standard' | 'vip';
export type ViewTab = 'booking' | 'history' | 'admin';
export type FilterTab = 'active' | 'past' | 'all';
export type AuthMode = 'login' | 'register';
export type AuthIntent = 'booking' | 'submit-booking' | 'history';
