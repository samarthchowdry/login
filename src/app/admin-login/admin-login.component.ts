import { Component, AfterViewInit, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthRoleService, UserRole } from '../services/auth-role.service';
import { environment } from '../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent implements AfterViewInit {
  username = '';
  password = '';
  loginError = '';
  isAuthenticating = false;
  private static readonly GOOGLE_CLIENT_ID = environment.GOOGLE_CLIENT_ID;

  private googleInitAttempts = 0;
  private googleInitialized = false;
  clientConfigured = false;
  googleAvailable = false;

  constructor(
    private ngZone: NgZone,
    private authRoleService: AuthRoleService,
    private router: Router
  ) {}

  ngAfterViewInit(): void {
    // Initialize Google Sign-In after view is initialized
    this.initializeGoogleSignIn();
    
    // Also try to render button after a delay to ensure DOM is ready
    setTimeout(() => {
      if (this.googleAvailable && this.clientConfigured && this.googleInitialized) {
        this.renderGoogleButton();
      }
    }, 500);
  }

  private initializeGoogleSignIn(): void {
    const clientId = AdminLoginComponent.GOOGLE_CLIENT_ID;

    const attemptInit = () => {
      const scriptLoaded =
        typeof window !== 'undefined' &&
        (window as any).google &&
        (window as any).google.accounts;

      this.googleAvailable = !!scriptLoaded;
      this.clientConfigured =
        !!clientId && !clientId.includes('YOUR_GOOGLE_CLIENT_ID');

      if (!scriptLoaded) {
        if (this.googleInitAttempts++ < 50) {
          setTimeout(attemptInit, 100);
        }
        return;
      }

      if (!this.clientConfigured) return;

      try {
        if (!this.googleInitialized) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => this.handleGoogleCredential(response),
            auto_select: false,
          });
          this.googleInitialized = true;
        }

        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          this.renderGoogleButton();
        }, 100);
      } catch (err) {
        console.warn('Google Sign-In init failed', err);
      }
    };

    attemptInit();
  }

  private renderGoogleButton(): void {
    if (!this.googleAvailable || !this.clientConfigured) {
      // Retry after a short delay if conditions aren't met yet
      setTimeout(() => {
        if (this.googleAvailable && this.clientConfigured) {
          this.renderGoogleButton();
        }
      }, 200);
      return;
    }

    const attemptRender = (attempts = 0) => {
      try {
        const loginBtn = document.getElementById('googleAdminLoginBtn');
        if (loginBtn) {
          // Only render if button hasn't been rendered yet
          if (loginBtn.hasChildNodes()) {
            return; // Already rendered
          }
          
          // Clear any existing content
          loginBtn.innerHTML = '';
          
          google.accounts.id.renderButton(loginBtn, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: 300
          });
          
          console.log('Google Sign-In button rendered successfully');
        } else if (attempts < 20) {
          // Retry if element not found yet (increased attempts)
          setTimeout(() => attemptRender(attempts + 1), 100);
        } else {
          console.warn('Google Sign-In button container not found after multiple attempts');
        }
      } catch (err) {
        console.warn('Google Sign-In render failed', err);
        if (attempts < 20) {
          setTimeout(() => attemptRender(attempts + 1), 100);
        }
      }
    };

    attemptRender();
  }

  async onLogin(): Promise<void> {
    if (this.isAuthenticating) {
      return;
    }

    const username = this.username.trim();
    const password = this.password.trim();

    if (!username || !password) {
      this.loginError = 'Please enter both username and password.';
      return;
    }

    this.isAuthenticating = true;
    this.loginError = '';

    try {
      const result = await this.resolveRoleAsync(username, password);
      if (!result || result.role !== 'ADMIN') {
        if (!this.loginError) {
          this.loginError = 'Invalid admin credentials. Only admin users can sign in here.';
        }
        return;
      }

      await this.finishLogin(result.role, result.token);
    } catch (err) {
      console.error('Admin login failed', err);
      this.loginError = 'Unable to login right now. Please retry.';
    } finally {
      this.isAuthenticating = false;
    }
  }

  private async resolveRoleAsync(username: string, password: string): Promise<{ role: UserRole; token?: string; data?: any } | null> {
    try {
      const response = await fetch('http://localhost:8080/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Invalid credentials' }));
        this.loginError = errorData.message || 'Invalid credentials';
        return null;
      }

      const data = await response.json();
      const role = (data?.role as UserRole) || null;
      const token = data?.token || null;
      
      return { role, token, data };
    } catch (err) {
      console.error('Admin login error:', err);
      return null;
    }
  }

  private async finishLogin(role: UserRole, token?: string): Promise<void> {
    this.ngZone.run(() => {
      if (token) {
        this.authRoleService.setRole(role, token);
      } else {
        this.authRoleService.setRole(role);
      }
      // Navigate to overview (main application dashboard)
      this.router.navigate(['/overview'], { replaceUrl: true });
    });
  }

  private handleGoogleCredential(response: any): void {
    const credential = response?.credential;
    if (!credential) return;

    fetch('http://localhost:8080/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: credential }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Verification failed');
        return res.json();
      })
      .then((data) => {
        this.ngZone.run(() => {
          const roleFromServer = (data?.role as UserRole) || 'STUDENT';
          
          // Only allow ADMIN role to proceed
          if (roleFromServer !== 'ADMIN') {
            this.loginError = 'This is an admin-only login page. Please use the regular login for other roles.';
            return;
          }

          const token = data?.token;
          if (token) {
            this.authRoleService.setRole(roleFromServer, token);
          } else {
            this.authRoleService.setRole(roleFromServer);
          }

          // Navigate to overview (main application dashboard)
          this.router.navigate(['/overview'], { replaceUrl: true });
        });
      })
      .catch(() => {
        this.ngZone.run(() => {
          this.loginError = 'Unable to verify Google token. Please try again.';
        });
      });
  }

  onGoogleFallbackClick(): void {
    // Fallback for when Google Sign-In button is not available
    // This will trigger the Google OAuth flow manually
    if (this.googleAvailable && this.clientConfigured) {
      // Try to trigger the Google Sign-In flow
      try {
        google.accounts.oauth2.initTokenClient({
          client_id: AdminLoginComponent.GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            if (response.access_token) {
              // If we get an access token, we need to exchange it for an ID token
              // For now, show a message to use the rendered button
              this.ngZone.run(() => {
                this.loginError = 'Please use the "Sign in with Google" button above.';
              });
            }
          },
          scope: 'email profile'
        }).requestAccessToken();
      } catch (err) {
        console.warn('Google OAuth fallback failed', err);
        this.ngZone.run(() => {
          this.loginError = 'Google Sign-In is not available. Please use username/password login or ensure Google Sign-In is properly configured.';
        });
      }
    } else {
      this.ngZone.run(() => {
        this.loginError = 'Google Sign-In is not configured. Please use username/password login.';
      });
    }
  }

  goToRegularLogin(): void {
    this.router.navigate(['/']);
  }
}

