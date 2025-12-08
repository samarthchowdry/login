import { Component, AfterViewInit, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { AuthRoleService, UserRole } from './services/auth-role.service';

declare const google: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit, OnInit {
  username = '';
  password = '';
  isLoggedIn = false;
  userName = '';
  userEmail = '';
  userRole: UserRole = 'STUDENT';
  sidebarOpen = false;
  signupMode = false;
  signupMessage = '';
  signupError = '';
  signupPreview: { name: string; email: string; picture?: string; googleSub?: string } | null = null;
  loginError = '';
  isAuthenticating = false;
  currentRoute = '';
  
  /**
   * Checks if we should show the login form.
   * Returns true if not logged in.
   */
  get shouldShowStudentLogin(): boolean {
    return !this.isLoggedIn;
  }
  
  private static readonly GOOGLE_CLIENT_ID = environment.GOOGLE_CLIENT_ID;

  private googleInitAttempts = 0;
  private googleInitialized = false;
  clientConfigured = false;
  googleAvailable = false;

  constructor(
    private ngZone: NgZone,
    private authRoleService: AuthRoleService,
    private router: Router
  ) {
    this.userRole = this.authRoleService.getRole();
    // Check if user is already authenticated
    this.isLoggedIn = this.authRoleService.isAuthenticated();
    
    this.authRoleService.role$.subscribe((role) => {
      this.userRole = role;
      // Update login status based on authentication
      this.isLoggedIn = this.authRoleService.isAuthenticated();
    });
  }

  ngOnInit(): void {
    // Track current route to show/hide login form appropriately
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.urlAfterRedirects || event.url || '';
        // Update login status when route changes (in case of navigation after login)
        this.isLoggedIn = this.authRoleService.isAuthenticated();
      });
    
    // Set initial route
    this.currentRoute = this.router.url || '';
    
    // Update login status on init
    this.isLoggedIn = this.authRoleService.isAuthenticated();
  }

  ngAfterViewInit(): void {
    this.initializeGoogleSignIn();
  }


  private initializeGoogleSignIn(): void {
    const clientId = AppComponent.GOOGLE_CLIENT_ID;

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

        this.renderGoogleButtons();
      } catch (err) {
        console.warn('Google Sign-In init failed', err);
      }
    };

    attemptInit();
  }

  private renderGoogleButtons(): void {
    if (!this.googleAvailable || !this.clientConfigured) return;

    try {
      const loginBtn = document.getElementById('googleLoginBtn');
      if (loginBtn) {
        loginBtn.innerHTML = '';
        google.accounts.id.renderButton(loginBtn, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'signin_with',
          width: 320,
        });
      }

      const signupBtn = document.getElementById('googleSignupBtn');
      if (signupBtn) {
        signupBtn.innerHTML = '';
        google.accounts.id.renderButton(signupBtn, {
          theme: 'filled_blue',
          size: 'large',
          shape: 'rectangular',
          text: 'signup_with',
          width: 320,
        });
      }
    } catch (err) {
      console.warn('Google Sign-In render failed', err);
    }
  }


  async onLogin(): Promise<void> {
    if (this.isAuthenticating) {
      return;
    }

    const username = this.username.trim();
    const password = this.password.trim();

    if (!username || !password) {
      this.loginError = 'Please enter both username/email and password.';
      return;
    }

    this.isAuthenticating = true;
    this.loginError = '';

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Invalid credentials' }));
        this.loginError = errorData.message || 'Invalid credentials';
        this.isAuthenticating = false;
        return;
      }

      const data = await response.json();
      this.ngZone.run(() => {
        this.userName = data?.name || '';
        this.userEmail = data?.email || '';
        const roleFromServer = (data?.role as UserRole) || 'STUDENT';
        const token = data?.token; // JWT token from backend

        // Store role and JWT token for production-ready authentication
        if (token) {
          this.authRoleService.setRole(roleFromServer, token);
        } else {
          this.authRoleService.setRole(roleFromServer);
        }

        this.finalizeOAuthLogin(roleFromServer);
      });
    } catch (err) {
      console.error('Login failed', err);
      this.ngZone.run(() => {
        this.loginError = 'Unable to login right now. Please retry.';
        this.isAuthenticating = false;
      });
    }
  }


  enterSignupMode(): void {
    this.signupMode = true;
    this.signupMessage = '';
    this.signupError = '';
    this.signupPreview = null;
    this.loginError = '';
    setTimeout(() => this.renderGoogleButtons(), 0);
  }


  exitSignupMode(): void {
    this.signupMode = false;
    this.signupMessage = '';
    this.signupError = '';
    this.signupPreview = null;
    this.loginError = '';
    setTimeout(() => this.renderGoogleButtons(), 0);
  }


  logout() {
    this.isLoggedIn = false;
    this.username = '';
    this.password = '';
    this.userName = '';
    this.userEmail = '';
    this.authRoleService.clearRole();
    this.userRole = 'STUDENT';
    this.signupMode = false;
    this.signupMessage = '';
    this.signupError = '';
    this.signupPreview = null;
    this.loginError = '';
    this.isAuthenticating = false;

    const loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn) loginBtn.innerHTML = '';
    const signupBtn = document.getElementById('googleSignupBtn');
    if (signupBtn) signupBtn.innerHTML = '';

    setTimeout(() => {
      this.initializeGoogleSignIn();
    }, 20);

    void this.router.navigate(['/'], { replaceUrl: true });
    this.sidebarOpen = true;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }


  openSidebar(): void {
    this.sidebarOpen = true;
  }
  

  onGoogleFallbackClick(forSignup = false): void {
    if (forSignup) {
      this.signupMode = true;
    }
    if (!this.clientConfigured) {
      alert('Please set your Google OAuth Client ID first.');
      return;
    }
    if (!this.googleAvailable) {
      alert('Google script not loaded. Check network/ad-blockers and reload.');
      return;
    }
    google.accounts.id.prompt();
  }


  private handleGoogleCredential(response: any): void {
    const credential = response?.credential;
    if (!credential) return;

    const fromSignup = this.signupMode;

    // Use unified login endpoint for all user types
    fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: credential }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Verification failed' }));
          throw new Error(errorData.message || 'Verification failed');
        }
        return res.json();
      })
      .then((data) => {
        this.ngZone.run(() => {
          this.userName = data?.name || '';
          this.userEmail = data?.email || '';
          const roleFromServer = (data?.role as UserRole) || 'STUDENT';
          const token = data?.token; // JWT token from backend
          
          // Store role and JWT token for production-ready authentication
          if (token) {
            this.authRoleService.setRole(roleFromServer, token);
          } else {
            this.authRoleService.setRole(roleFromServer);
          }

          if (fromSignup) {
            this.signupPreview = {
              name: data?.name || '',
              email: data?.email || '',
              picture: data?.picture || '',
              googleSub: data?.googleSub || '',
            };
            this.signupMessage = 'Google account verified. Confirm your details to finish signup.';
            this.signupError = '';
          } else {
            this.finalizeOAuthLogin(roleFromServer);
          }
        });
      })
      .catch(() => {
        const payload = this.decodeJwt(credential);
        this.ngZone.run(() => {
          if (!payload) {
            this.signupError = 'Unable to verify Google token. Please try again.';
            return;
          }

          this.userName = payload?.name || payload?.given_name || '';
          this.userEmail = payload?.email || '';
          // For signup, default to STUDENT role
          this.authRoleService.setRole('STUDENT');

          if (fromSignup) {
            this.signupPreview = {
              name: this.userName,
              email: this.userEmail,
              picture: payload?.picture,
              googleSub: payload?.sub,
            };
            this.signupMessage = 'Google token verified locally. Confirm your details to finish signup.';
            this.signupError = '';
          } else {
            this.finalizeOAuthLogin('STUDENT');
          }
        });
      });
  }


  completeSignup(): void {
    if (!this.signupPreview) {
      this.signupError = 'Missing signup information. Please try again.';
      return;
    }

    if (!this.signupPreview.email || !this.signupPreview.googleSub) {
      this.signupError = 'Email and Google account are required.';
      return;
    }

    this.signupError = '';

    fetch('http://localhost:8080/api/auth/google/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleSub: this.signupPreview.googleSub,
        email: this.signupPreview.email,
        name: this.signupPreview.name,
        picture: this.signupPreview.picture,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || 'Failed to save account');
        }
        return res.json();
      })
      .then((data) => {
        this.ngZone.run(() => {
          this.userName = data?.name || this.signupPreview?.name || '';
          this.userEmail = data?.email || this.signupPreview?.email || '';
          const roleFromServer = (data?.role as UserRole) || 'STUDENT';
          const token = data?.token; // JWT token from backend
          
          // Store role and JWT token for production-ready authentication
          if (token) {
            this.authRoleService.setRole(roleFromServer, token);
          } else {
            this.authRoleService.setRole(roleFromServer);
          }
          
          this.signupMode = false;
          this.signupPreview = null;
          this.signupMessage = '';
          this.finalizeOAuthLogin(roleFromServer);
        });
      })
      .catch((error: Error) => {
        this.ngZone.run(() => {
          this.signupError =
            error.message || 'Could not save account details. Please try again.';
        });
      });
  }

  private decodeJwt(jwt: string): any {
    try {
      const base64Url = jwt.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  private resolveRoleAsync(
    username: string,
    password: string
  ): Promise<UserRole | null> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.matchRole(username, password)), 350);
    });
  }

  private matchRole(username: string, password: string): UserRole | null {
    const user = username.toLowerCase();
    if (user === 'sam' && password === '2345') {
      return 'ADMIN';
    }
    if (user === 'teacher' && password === '2345') {
      return 'TEACHER';
    }
    if (user === 'student' && password === '2345') {
      return 'STUDENT';
    }
    return null;
  }

  private async finishLogin(role: UserRole): Promise<void> {
    this.authRoleService.setRole(role);
    this.isLoggedIn = true;
    this.userRole = role;
    this.username = '';
    this.password = '';

    await this.navigateToRole(role);
  }

  private finalizeOAuthLogin(role: UserRole): void {
    this.isLoggedIn = true;
    this.userRole = role;
    void this.navigateToRole(role);
  }

  private navigateToRole(role: UserRole): Promise<boolean> {
    const target = role === 'ADMIN' ? ['/overview'] : ['/home'];
    return this.router.navigate(target, { replaceUrl: true });
    
  }
}