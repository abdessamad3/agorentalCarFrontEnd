import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CompanyService } from './company.service';

@Injectable({
  providedIn: 'root'
})
export class VoitureService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private companyService: CompanyService) {}

  getVoitures(page: number = 1, limit: number = 10, search: string = '', dateFrom: string = '', dateTo: string = ''): Observable<any> {
    let url = `${this.apiUrl}/voiture?page=${page}&limit=${limit}`;
    if (search)   url += `&search=${encodeURIComponent(search)}`;
    if (dateFrom) url += `&dateDebut=${encodeURIComponent(dateFrom)}`;
    if (dateTo)   url += `&dateFin=${encodeURIComponent(dateTo)}`;
    const bureauId = this.companyService.getCurrentBureauId();
    if (bureauId)  url += `&bureauId=${bureauId}`;
    return this.http.get<any>(url);
  }

  getVoitureById(id: number): Observable<any> {
    const url = `${this.apiUrl}/voiture/${id}`;
    return this.http.get<any>(url);
  }

  createVoiture(formData: FormData): Observable<any> {
    const url = `${this.apiUrl}/voiture`;
    return this.http.post<any>(url, formData);
  }

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

  deleteVoiture(id: number): Observable<any> {
    const url = `${this.apiUrl}/voiture/${id}`;
    return this.http.delete<any>(url);
  }

  applyLifecycleEvent(carId: number, event: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/voiture/${carId}/lifecycle`, { event });
  }

  recordSale(data: { voitureId: number; dateVente: string; prixVente: number; acheteur?: string; notes?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/vente`, data);
  }

  getVenteForVoiture(voitureId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vente?voitureId=${voitureId}&limit=1`);
  }

}
