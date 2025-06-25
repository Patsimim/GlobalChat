// socket.service.ts (Optional - for more advanced socket management)
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | null = null;
  private connectionStatus = new BehaviorSubject<boolean>(false);

  constructor(private authService: AuthService) {}

  connect(): void {
    const token = this.authService.getToken();
    if (!token) return;

    const serverUrl = this.authService.getApiUrl().replace('/api', '');

    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      this.connectionStatus.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connectionStatus.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionStatus.next(false);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus.next(false);
    }
  }

  isConnected(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }

  emit(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on<T>(event: string): Observable<T> {
    return new Observable((observer) => {
      if (this.socket) {
        this.socket.on(event, (data: T) => observer.next(data));
      }

      return () => {
        if (this.socket) {
          this.socket.off(event);
        }
      };
    });
  }

  // Room management
  joinRoom(roomName: string): void {
    this.emit('join_room', { room: roomName });
  }

  leaveRoom(roomName: string): void {
    this.emit('leave_room', { room: roomName });
  }
}
