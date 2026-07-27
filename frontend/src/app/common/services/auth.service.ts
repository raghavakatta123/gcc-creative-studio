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

import {Injectable, Inject, PLATFORM_ID} from '@angular/core';
import {Router} from '@angular/router';
import {HttpClient, HttpHeaders, HttpErrorResponse} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {UserModel} from '../models/user.model';
import {UserService} from '../services/user.service';
import {Observable, from, throwError, of} from 'rxjs';
import {catchError, tap, map, switchMap} from 'rxjs/operators';
import {isPlatformBrowser} from '@angular/common';
import {OKTA_AUTH} from '@okta/okta-angular';
import OktaAuth, {UserClaims} from '@okta/okta-auth-js';

const USER_DETAILS = 'USER_DETAILS';
const LOGIN_ROUTE = '/login';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    @Inject(OKTA_AUTH) private oktaAuth: OktaAuth,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private httpClient: HttpClient,
    private userService: UserService,
  ) {}

  /**
   * Initiates Okta login via redirect-based PKCE flow.
   */
  signIn(): void {
    this.oktaAuth.signInWithRedirect();
  }

  /**
   * Handles the OAuth callback after redirect from Okta.
   * Parses tokens from the URL and stores them in the token manager.
   */
  async handleCallback(): Promise<void> {
    await this.oktaAuth.handleLoginRedirect();
  }

  /**
   * Returns the Okta access token string, or null if not available.
   */
  getAccessToken(): string | null {
    const tokenObj = this.oktaAuth.getAccessToken();
    return tokenObj || null;
  }

  /**
   * Returns an Observable that emits the current access token.
   * Used by the auth interceptor.
   */
  getAccessToken$(): Observable<string> {
    const token = this.getAccessToken();
    if (token) {
      return of(token);
    }
    return throwError(() => new Error('No valid access token available.'));
  }

  /**
   * Checks whether the user is currently authenticated with Okta.
   */
  async isAuthenticated(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    return this.oktaAuth.isAuthenticated();
  }

  /**
   * Synchronous check using the token manager for route guards.
   * Returns true if an access token exists and is not expired.
   */
  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const accessToken = this.oktaAuth.tokenManager.getTokensSync()?.accessToken;
    if (!accessToken) return false;
    return !this.oktaAuth.tokenManager.hasExpired(accessToken);
  }

  /**
   * Logs out of Okta and clears local storage.
   */
  async logout(route: string = LOGIN_ROUTE): Promise<void> {
    try {
      localStorage.removeItem(USER_DETAILS);
      localStorage.removeItem('showTooltip');
      await this.oktaAuth.signOut({
        postLogoutRedirectUri: environment.okta.postLogoutRedirectUri,
      });
    } catch (e) {
      console.error('Sign Out Error', e);
      localStorage.removeItem(USER_DETAILS);
      localStorage.removeItem('showTooltip');
      void this.router.navigate([LOGIN_ROUTE]);
    }
  }

  /**
   * Gets the user claims from the ID token.
   */
  async getUserClaims(): Promise<UserClaims | undefined> {
    const idToken = this.oktaAuth.tokenManager.getTokensSync()?.idToken;
    if (idToken) {
      return idToken.claims;
    }
    return undefined;
  }

  /**
   * Syncs the user profile with the backend after login.
   * Uses the access token for authorization.
   */
  syncUserWithBackend$(): Observable<UserModel> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available for backend sync.'));
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.httpClient
      .get<UserModel>(`${environment.backendURL}/users/me`, {headers})
      .pipe(
        tap((userDetails: UserModel) => {
          localStorage.setItem(USER_DETAILS, JSON.stringify(userDetails));
          console.log('User profile successfully synced with backend.');
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Failed to sync user with backend', error);
          return throwError(
            () =>
              new Error(
                error?.error?.detail ||
                  `Could not synchronize user profile with the server. ${error?.error?.detail}`,
              ),
          );
        }),
      );
  }

  isUserLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return this.isLoggedIn();
  }

  isUserAdmin(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const user_role = this.userService.getUserDetails()?.roles;
    return user_role?.includes('admin') || false;
  }

  isUserWorkflows(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const user_role = this.userService.getUserDetails()?.roles;
    return user_role?.includes('workflows') || false;
  }

  /**
   * Gets the stored token (for backward compatibility).
   */
  getToken(): string | null {
    return this.getAccessToken();
  }
}
