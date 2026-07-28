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

import {Component, OnInit, Inject} from '@angular/core';
import {Router} from '@angular/router';
import {OKTA_AUTH} from '@okta/okta-angular';
import OktaAuth from '@okta/okta-auth-js';

@Component({
  selector: 'app-login-callback',
  template: '<p style="color:white;text-align:center;margin-top:50px;">Signing in...</p>',
})
export class LoginCallbackComponent implements OnInit {
  constructor(
    @Inject(OKTA_AUTH) private oktaAuth: OktaAuth,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Parse tokens from the callback URL
      const tokenResponse = await this.oktaAuth.token.parseFromUrl();
      // Store tokens in the token manager
      this.oktaAuth.tokenManager.setTokens(tokenResponse.tokens);
      // Navigate to home
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Login callback error:', error);
      this.router.navigate(['/login']);
    }
  }
}
