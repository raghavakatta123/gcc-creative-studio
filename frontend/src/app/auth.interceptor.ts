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
    // Get the Okta access token and attach it to outgoing API requests.
    return this.authService.getAccessToken$().pipe(
      switchMap(token => {
        const authorizedRequest = request.clone({
          setHeaders: {Authorization: `Bearer ${token}`},
        });
        return next.handle(authorizedRequest);
      }),
      catchError(error => {
        // If the error is NOT an HttpErrorResponse, it's a token retrieval failure.
        // In this case, the session is invalid, and we should log out.
        if (!(error instanceof HttpErrorResponse)) {
          console.error(
            'AuthInterceptor: No valid access token. Logging out.',
            error,
          );
          void this.authService.logout();
        }

        // Otherwise, it's a backend API error (e.g., 404, 500). We should NOT log out.
        // We just re-throw the original HttpErrorResponse so the calling service can handle it.
        return throwError(() => error);
      }),
    );
  }
}
