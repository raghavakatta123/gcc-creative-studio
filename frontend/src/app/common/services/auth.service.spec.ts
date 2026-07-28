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

import {TestBed} from '@angular/core/testing';
import {AuthService} from './auth.service';
import {OKTA_AUTH} from '@okta/okta-angular';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {RouterTestingModule} from '@angular/router/testing';

describe('AuthService', () => {
  let service: AuthService;

  const mockOktaAuth = {
    signInWithRedirect: jasmine.createSpy(),
    handleLoginRedirect: jasmine.createSpy(),
    getAccessToken: jasmine.createSpy().and.returnValue(null),
    isAuthenticated: jasmine.createSpy().and.returnValue(Promise.resolve(false)),
    signOut: jasmine.createSpy(),
    tokenManager: {
      getTokensSync: jasmine.createSpy().and.returnValue(null),
      hasExpired: jasmine.createSpy().and.returnValue(true),
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [{provide: OKTA_AUTH, useValue: mockOktaAuth}],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
