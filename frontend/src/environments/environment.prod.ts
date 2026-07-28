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

const origin = typeof window !== 'undefined' ? window.location.origin : '';

export const environment = {
  okta: {
    clientId: '0oa15oarm1xsvWAUj698',
    issuer: 'https://integrator-2746482.okta.com/oauth2/default',
    redirectUri: origin + '/login/callback',
    postLogoutRedirectUri: origin,
    scopes: ['openid', 'profile', 'email', 'groups'],
  },
  production: true,
  isLocal: false,
  backendURL: '/api',
  EMAIL_REGEX:
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  ADMIN: 'admin',
};
