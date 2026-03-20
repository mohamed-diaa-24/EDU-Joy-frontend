import { Injectable, signal } from '@angular/core';

import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null>(null);

  login(email: string, password: string): void {
    // Stub implementation; wire to API later.
    void password;
    this.currentUser.set({
      id: 'temp-user-id',
      email,
      displayName: 'Temporary User',
    });
  }

  logout(): void {
    this.currentUser.set(null);
  }
}
