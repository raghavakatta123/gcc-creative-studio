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

import {Injectable} from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';
import {AuthService} from './common/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    // Skip auth for non-API requests or when on login/callback pages
    if (!request.url.includes('/api')) {
      return next.handle(request);
    }

    // Try to get the access token
    const token = this.authService.getAccessToken();

    // If no token, pass request without auth header (backend will return 401)
    if (!token) {
      return next.handle(request);
    }

    // Attach token to the request
    const authorizedRequest = request.clone({
      setHeaders: {Authorization: `Bearer ${token}`},
    });

    return next.handle(authorizedRequest).pipe(
      catchError(error => {
        // If 401 from backend, the token is invalid/expired
        if (error instanceof HttpErrorResponse && error.status === 401) {
          void this.authService.logout();
        }
        return throwError(() => error);
      }),
    );
  }
}
