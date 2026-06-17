import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001/api';
  return `http://${window.location.hostname}:3001/api`;
}

export const API_URL = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3001/api`
  : 'http://localhost:3001/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function removeToken(): void {
  localStorage.removeItem('token');
}
