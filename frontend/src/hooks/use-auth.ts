'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getToken, setToken, removeToken } from '@/lib/utils';
import type { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<User>('/auth/me');
      setUser(data);
    } catch {
      removeToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ access_token: string }>('/auth/login', {
      email,
      password,
    });
    setToken(data.access_token);
    await fetchUser();
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api.post<{ access_token: string }>('/auth/register', {
      name,
      email,
      password,
    });
    setToken(data.access_token);
    await fetchUser();
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  return { user, loading, login, register, logout };
}
