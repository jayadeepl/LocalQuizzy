import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getBackendUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return `http://${window.location.hostname}:3001`;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getBackendUrl(), {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
