import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  private store = new Map<string, { value: any; expiresAt?: number }>();

  set(key: string, value: any, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  get<T = any>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  del(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  keys(pattern?: string): string[] {
    const allKeys = Array.from(this.store.keys());
    if (!pattern) return allKeys;
    const regex = new RegExp(pattern.replace('*', '.*'));
    return allKeys.filter((k) => regex.test(k));
  }
}
