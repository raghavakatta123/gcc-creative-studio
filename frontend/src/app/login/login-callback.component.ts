/**
 * Debug version - shows all info, does NOT redirect
 */
import {Component, OnInit, Inject} from '@angular/core';
import {OKTA_AUTH} from '@okta/okta-angular';
import OktaAuth from '@okta/okta-auth-js';

@Component({
  selector: 'app-login-callback',
  template: '<pre style="color:lime;background:black;padding:20px;font-size:12px;white-space:pre-wrap;">{{debugInfo}}</pre>',
})
export class LoginCallbackComponent implements OnInit {
  debugInfo = 'Loading...';

  constructor(
    @Inject(OKTA_AUTH) private oktaAuth: OktaAuth,
  ) {}

  async ngOnInit(): Promise<void> {
    const info: string[] = [];

    info.push('=== OKTA CALLBACK DEBUG ===');
    info.push('');
    info.push('1. Current URL: ' + window.location.href);
    info.push('2. Origin: ' + window.location.origin);
    info.push('3. Search params: ' + window.location.search);
    info.push('4. Hash: ' + window.location.hash);
    info.push('');
    info.push('5. isLoginRedirect(): ' + this.oktaAuth.isLoginRedirect());
    info.push('');
    info.push('6. OktaAuth config:');
    info.push('   - clientId: ' + (this.oktaAuth as any).options?.clientId);
    info.push('   - issuer: ' + (this.oktaAuth as any).options?.issuer);
    info.push('   - redirectUri: ' + (this.oktaAuth as any).options?.redirectUri);
    info.push('   - pkce: ' + (this.oktaAuth as any).options?.pkce);
    info.push('   - responseMode: ' + (this.oktaAuth as any).options?.responseMode);
    info.push('');
    info.push('7. SessionStorage keys: ' + Object.keys(sessionStorage).join(', '));
    info.push('8. LocalStorage okta keys: ' + Object.keys(localStorage).filter(k => k.includes('okta')).join(', '));
    info.push('');

    this.debugInfo = info.join('\n');

    // Now try the token exchange
    info.push('9. Attempting storeTokensFromRedirect()...');
    this.debugInfo = info.join('\n');

    try {
      await this.oktaAuth.storeTokensFromRedirect();
      info.push('   ✅ SUCCESS!');
      info.push('');
      info.push('10. isAuthenticated: ' + await this.oktaAuth.isAuthenticated());
      info.push('11. Access Token: ' + (this.oktaAuth.getAccessToken() ? 'EXISTS (' + this.oktaAuth.getAccessToken()?.substring(0, 20) + '...)' : 'NULL'));
    } catch (error: any) {
      info.push('   ❌ FAILED: ' + (error?.message || JSON.stringify(error)));
      info.push('   Error name: ' + error?.name);
      info.push('   Error stack: ' + error?.stack?.substring(0, 200));
    }

    info.push('');
    info.push('=== END DEBUG ===');
    this.debugInfo = info.join('\n');
  }
}
