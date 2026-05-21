import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if token exists in localStorage on init
    const storedToken = localStorage.getItem('auth_token');
    console.log('🔵 AuthService init - Token from localStorage:', storedToken);
    if (storedToken) {
      this.tokenSubject.next(storedToken);
    }
  }

  register(email: string, password: string): Observable<any> {
    console.log('📝 Registering:', email);
    return this.http.post(`${this.apiUrl}/auth/register`, {
      email,
      password
    });
  }

  login(email: string, password: string): Observable<any> {
    console.log('🔑 Login request to:', `${this.apiUrl}/auth/login`);

    return this.http.post(`${this.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap((response: any) => {
        console.log('✅ Login response received:', response);

        if (response.token) {
          console.log('💾 Storing token...');
          console.log('Token value:', response.token.substring(0, 20) + '...');

          localStorage.setItem('auth_token', response.token);
          this.tokenSubject.next(response.token);

          console.log('✅ Token stored successfully');
          console.log('Token now in localStorage:', localStorage.getItem('auth_token'));
        } else {
          console.error('❌ No token in response!');
        }
      })
    );
  }

  getToken(): string | null {
    const token = localStorage.getItem('auth_token');
    console.log('🔍 getToken called - Token:', token ? token.substring(0, 20) + '...' : 'NULL');
    return token;
  }

  isAuthenticated(): boolean {
    const hasToken = !!this.getToken();
    console.log('🔍 isAuthenticated:', hasToken);
    return hasToken;
  }

  logout() {
    console.log('🚪 Logout');
    localStorage.removeItem('auth_token');
    this.tokenSubject.next(null);
  }
}
