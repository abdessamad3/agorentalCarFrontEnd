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
    if (storedToken) {
      this.tokenSubject.next(storedToken);
    }
  }

  register(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, {
      email,
      password
    });
  }

  login(email: string, password: string): Observable<any> {

    return this.http.post(`${this.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap((response: any) => {

        if (response.token) {

          localStorage.setItem('auth_token', response.token);
          this.tokenSubject.next(response.token);

        } else {
          console.error('❌ No token in response!');
        }
      })
    );
  }

  getToken(): string | null {
    const token = localStorage.getItem('auth_token');
    return token;
  }

  isAuthenticated(): boolean {
    const hasToken = !!this.getToken();
    return hasToken;
  }

  logout() {
    localStorage.removeItem('auth_token');
    this.tokenSubject.next(null);
  }
}
