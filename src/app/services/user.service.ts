import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // GET CURRENT USER (From /api/auth/me)
  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/me`);
  }

  // GET USER BY ID
  getUserById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/utilisateur/${id}`);
  }

  // UPDATE USER PROFILE
  updateUser(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/utilisateur/${id}`, data);
  }

  // DELETE USER
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/utilisateur/${id}`, { responseType: 'text' });
  }
}
