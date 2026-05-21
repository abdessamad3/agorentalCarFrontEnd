import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VoitureService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // GET: List of cars
  getVoitures(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/voiture`);
  }

  // GET: Single car details
  getVoitureById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/voiture/${id}`);
  }

  // POST: Create car with Image
  createVoiture(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/voiture`, formData);
  }
}
