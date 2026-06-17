'use client';

import { useState, useCallback } from 'react';

export function useTimer() {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);

  const start = useCallback((seconds: number) => {
    setTotal(seconds);
    setRemaining(seconds);
  }, []);

  const update = useCallback((seconds: number) => {
    setRemaining(seconds);
  }, []);

  const reset = useCallback(() => {
    setRemaining(0);
    setTotal(0);
  }, []);

  const percentage = total > 0 ? (remaining / total) * 100 : 0;

  return { remaining, total, percentage, start, update, reset };
}
