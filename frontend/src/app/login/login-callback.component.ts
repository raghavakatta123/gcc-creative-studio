/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from './../common/services/auth.service';

@Component({
  selector: 'app-login-callback',
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <mat-spinner [diameter]="50"></mat-spinner>
    </div>
  `,
})
export class LoginCallbackComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.authService.handleCallback();
      // After handling callback, sync user with backend
      this.authService.syncUserWithBackend$().subscribe({
        next: () => {
          void this.router.navigate(['/']);
        },
        error: (err) => {
          console.error('Failed to sync user after login:', err);
          // Still navigate to home - the user is authenticated
          void this.router.navigate(['/']);
        },
      });
    } catch (error) {
      console.error('Error handling Okta callback:', error);
      void this.router.navigate(['/login']);
    }
  }
}
