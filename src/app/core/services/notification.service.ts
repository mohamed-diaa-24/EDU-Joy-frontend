import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  messageKey: string;
  type: NotificationType;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notification = signal<AppNotification | null>(null);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(messageKey: string, type: NotificationType = 'success', durationMs = 2500): void {
    this.clearTimer();
    this.notification.set({ messageKey, type });
    this.timeoutId = setTimeout(() => this.clear(), durationMs);
  }

  clear(): void {
    this.clearTimer();
    this.notification.set(null);
  }

  private clearTimer(): void {
    if (!this.timeoutId) {
      return;
    }

    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }
}
