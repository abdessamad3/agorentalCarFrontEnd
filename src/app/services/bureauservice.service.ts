import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BureauService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
  }

  /**
   * Get list of bureaus with pagination, search, and filters
   */
  getBureaus(page: number = 1, limit: number = 10, search: string = '', statut: string = ''): Observable<any> {
    let url = `${this.apiUrl}/bureau?page=${page}&limit=${limit}`;

    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    if (statut) {
      url += `&statut=${encodeURIComponent(statut)}`;
    }

    return this.http.get<any>(url);
  }

  /**
   * Get single bureau by ID
   */
  getBureauById(id: number): Observable<any> {
    const url = `${this.apiUrl}/bureau/${id}`;
    return this.http.get<any>(url);
  }

  /**
   * Create new bureau
   */
  createBureau(data: any): Observable<any> {
    const url = `${this.apiUrl}/bureau`;
    return this.http.post<any>(url, data);
  }

  /**
   * Update bureau
   */
  updateBureau(id: number, data: any): Observable<any> {
    const url = `${this.apiUrl}/bureau/${id}`;
    return this.http.put<any>(url, data);
  }

  /**
   * Delete bureau
   */
  deleteBureau(id: number): Observable<any> {
    const url = `${this.apiUrl}/bureau/${id}`;
    return this.http.delete<any>(url);
  }
}
