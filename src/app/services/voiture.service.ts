import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VoitureService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
  }

  /**
   * Get list of voitures with pagination and filters
   */
  getVoitures(page: number = 1, limit: number = 10, search: string = '', dateFrom: string = '', dateTo: string = ''): Observable<any> {
    let url = `${this.apiUrl}/voiture?page=${page}&limit=${limit}`;
    if (search)   url += `&search=${encodeURIComponent(search)}`;
    if (dateFrom) url += `&dateDebut=${encodeURIComponent(dateFrom)}`;
    if (dateTo)   url += `&dateFin=${encodeURIComponent(dateTo)}`;
    return this.http.get<any>(url);
  }

  /**
   * Get single voiture by ID
   */
  getVoitureById(id: number): Observable<any> {
    const url = `${this.apiUrl}/voiture/${id}`;
    return this.http.get<any>(url);
  }

  /**
   * Create new voiture with image upload
   */
  createVoiture(formData: FormData): Observable<any> {
    const url = `${this.apiUrl}/voiture`;
    return this.http.post<any>(url, formData);
  }

  /**
   * Update voiture
   */
  updateVoiture(id: number, data: any): Observable<any> {
    const url = `${this.apiUrl}/voiture/${id}`;
    return this.http.put<any>(url, data);
  }

  updateVoitureImage(id: number, file: File): Observable<any> {
    const fd = new FormData();
    fd.append('imageFile', file);
    return this.http.post<any>(`${this.apiUrl}/voiture/${id}/image`, fd);
  }

  addVoitureImage(id: number, file: File): Observable<any> {
    const fd = new FormData();
    fd.append('imageFile', file);
    return this.http.post<any>(`${this.apiUrl}/voiture/${id}/images`, fd);
  }

  deleteVoitureImage(voitureId: number, imageId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/voiture/${voitureId}/images/${imageId}`);
  }

  /**
   * Delete voiture
   */
  deleteVoiture(id: number): Observable<any> {
    const url = `${this.apiUrl}/voiture/${id}`;
    return this.http.delete<any>(url);
  }

  /**
   * Search voitures
   */
  searchVoitures(search: string, page: number = 1): Observable<any> {
    return this.getVoitures(page, 10, search);
  }

  /**
   * Filter voitures by status
   */
  filterByStatus(status: string, page: number = 1): Observable<any> {
    const url = `${this.apiUrl}/voiture?page=${page}&voitureStatus=${status}`;
    return this.http.get<any>(url);
  }

  /**
   * Filter voitures by fuel type
   */
  filterByFuel(fuel: string, page: number = 1): Observable<any> {
    const url = `${this.apiUrl}/voiture?page=${page}&typeCarburant=${fuel}`;
    return this.http.get<any>(url);
  }
}
