// src/app/services/debug.service.ts
import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DebugInfo {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
}

export interface ConnectionStatus {
  api: boolean;
  socket: boolean;
  auth: boolean;
  lastChecked: Date;
}

@Injectable({
  providedIn: 'root',
})
export class DebugService {
  private debugLogs: DebugInfo[] = [];
  private maxLogs = 1000;
  private logsSubject = new BehaviorSubject<DebugInfo[]>([]);

  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
    api: false,
    socket: false,
    auth: false,
    lastChecked: new Date(),
  });

  constructor() {
    // Enable debug mode in development
    if (this.isDevelopment()) {
      (window as any).chatDebug = this;
      this.log('info', 'Debug', 'Debug service initialized');
    }
  }

  // Logging methods
  log(
    level: 'info' | 'warn' | 'error' | 'debug',
    category: string,
    message: string,
    data?: any
  ) {
    const logEntry: DebugInfo = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
    };

    this.debugLogs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.debugLogs.length > this.maxLogs) {
      this.debugLogs = this.debugLogs.slice(-this.maxLogs);
    }

    this.logsSubject.next([...this.debugLogs]);

    // Console output with styling
    const style = this.getConsoleStyle(level);
    console.log(`%c[${category}] ${message}`, style, data ? data : '');
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    if (this.isDevelopment()) {
      this.log('debug', category, message, data);
    }
  }

  // HTTP Error handling
  handleHttpError(error: HttpErrorResponse, context: string): void {
    let errorMessage = 'Unknown error occurred';
    let errorData: any = { status: error.status, url: error.url };

    switch (error.status) {
      case 0:
        errorMessage = 'Network error - Cannot connect to server';
        break;
      case 401:
        errorMessage = 'Unauthorized - Token invalid or expired';
        errorData.code = error.error?.code;
        break;
      case 403:
        errorMessage = 'Forbidden - Access denied';
        break;
      case 404:
        errorMessage = 'Not found - Endpoint does not exist';
        break;
      case 429:
        errorMessage = 'Rate limited - Too many requests';
        errorData.retryAfter = error.error?.retryAfter;
        break;
      case 500:
        errorMessage = 'Server error - Internal server error';
        break;
      default:
        errorMessage = error.error?.message || error.message;
    }

    this.error('HTTP', `${context}: ${errorMessage}`, errorData);
  }

  // Connection status tracking
  updateConnectionStatus(type: keyof ConnectionStatus, status: boolean) {
    const current = this.connectionStatusSubject.value;
    const updated = {
      ...current,
      [type]: status,
      lastChecked: new Date(),
    };
    this.connectionStatusSubject.next(updated);
    this.debug(
      'Connection',
      `${type} status: ${status ? 'Connected' : 'Disconnected'}`
    );
  }

  getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatusSubject.asObservable();
  }

  // Auth token debugging
  debugAuthToken(token: string | null): void {
    if (!token) {
      this.warn('Auth', 'No token found');
      return;
    }

    try {
      const payload = this.decodeJWT(token);
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < now;
      const timeToExpiry = payload.exp - now;

      this.debug('Auth', 'Token analysis', {
        userId: payload.userId,
        isExpired,
        timeToExpiry: `${Math.floor(timeToExpiry / 60)} minutes`,
        issuer: payload.iss,
        audience: payload.aud,
      });

      if (isExpired) {
        this.error('Auth', 'Token is expired');
      }
    } catch (e) {
      this.error('Auth', 'Invalid token format', e);
    }
  }

  // Socket debugging
  debugSocketConnection(socket: any): void {
    if (!socket) {
      this.warn('Socket', 'Socket instance not found');
      return;
    }

    this.debug('Socket', 'Socket state', {
      connected: socket.connected,
      id: socket.id,
      transport: socket.io.engine.transport.name,
      readyState: socket.io.engine.readyState,
    });
  }

  // API endpoint testing
  async testApiEndpoints(baseUrl: string, token: string): Promise<void> {
    const endpoints = [
      '/auth/profile',
      '/chat/world/messages',
      '/chat/groups',
      '/chat/private',
      '/chat/online-users',
    ];

    this.info('API Test', 'Testing API endpoints...');

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const status = response.status;
        const success = status >= 200 && status < 300;

        this.log(
          success ? 'info' : 'error',
          'API Test',
          `${endpoint}: ${status} ${response.statusText}`
        );

        if (!success) {
          const errorText = await response.text();
          this.debug('API Test', `${endpoint} error body`, errorText);
        }
      } catch (error) {
        this.error('API Test', `${endpoint}: Network error`, error);
      }
    }
  }

  // Performance monitoring
  startTimer(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug('Performance', `${name}: ${duration.toFixed(2)}ms`);
    };
  }

  // Memory usage (if available)
  logMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.debug('Memory', 'Usage', {
        used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)}MB`,
        total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)}MB`,
        limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)}MB`,
      });
    }
  }

  // Export logs
  exportLogs(): string {
    return JSON.stringify(this.debugLogs, null, 2);
  }

  // Clear logs
  clearLogs(): void {
    this.debugLogs = [];
    this.logsSubject.next([]);
    this.info('Debug', 'Logs cleared');
  }

  // Get logs observable
  getLogs(): Observable<DebugInfo[]> {
    return this.logsSubject.asObservable();
  }

  // Utility methods
  private isDevelopment(): boolean {
    return !environment.production;
  }

  private decodeJWT(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  private getConsoleStyle(level: string): string {
    const styles = {
      info: 'color: #2196F3; font-weight: bold;',
      warn: 'color: #FF9800; font-weight: bold;',
      error: 'color: #F44336; font-weight: bold;',
      debug: 'color: #9E9E9E;',
    };
    return styles[level as keyof typeof styles] || styles.info;
  }
}

// Environment import (add this to your environment files if not present)
declare const environment: { production: boolean };
