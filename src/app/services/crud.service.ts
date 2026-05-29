import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CrudService {
  constructor(private http: HttpClient) {}

  getAll(endpoint: string, params: Record<string, any> = {}): Observable<any> {
    return this.http.get(`${environment.apiUrl}/${endpoint}`, { params });
  }

  getOne(endpoint: string, id: number): Observable<any> {
    return this.http.get(`${environment.apiUrl}/${endpoint}/${id}`);
  }

  create(endpoint: string, data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/${endpoint}`, data);
  }

  update(endpoint: string, id: number, data: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/${endpoint}/${id}`, data);
  }

  remove(endpoint: string, id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/${endpoint}/${id}`);
  }
}
