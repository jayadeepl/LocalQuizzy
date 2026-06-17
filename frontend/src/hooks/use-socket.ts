'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket';

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = socketRef.current;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    if (s.connected) {
      setConnected(true);
    } else {
      s.connect();
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current.on(event, handler);
    return () => {
      socketRef.current.off(event, handler);
    };
  }, []);

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    if (handler) {
      socketRef.current.off(event, handler);
    } else {
      socketRef.current.removeAllListeners(event);
    }
  }, []);

  return { socket: socketRef.current, emit, on, off, connected };
}
