import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ContratService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getContrats(page = 1, limit = 20, search = '', reservationId?: number): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('search', search);
    if (reservationId) params = params.set('reservationId', reservationId);
    return this.http.get(`${this.base}/contrat`, { params });
  }

  getContrat(id: number): Observable<any> {
    return this.http.get(`${this.base}/contrat/${id}`);
  }

  createContrat(data: any): Observable<any> {
    return this.http.post(`${this.base}/contrat`, data);
  }

  updateContrat(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/contrat/${id}`, data);
  }

  deleteContrat(id: number): Observable<any> {
    return this.http.delete(`${this.base}/contrat/${id}`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/contrat/${id}/pdf`, { responseType: 'blob' });
  }

  getParametresSociete(): Observable<any> {
    return this.http.get(`${this.base}/parametres-societe`);
  }

  updateParametresSociete(data: any): Observable<any> {
    return this.http.put(`${this.base}/parametres-societe`, data);
  }

  uploadLogo(file: File): Observable<any> {
    const form = new FormData();
    form.append('logo', file);
    return this.http.post(`${this.base}/parametres-societe/logo`, form);
  }

  getConditionsContrat(): Observable<any> {
    return this.http.get(`${this.base}/conditions-contrat`);
  }

  updateConditionsContrat(data: any): Observable<any> {
    return this.http.put(`${this.base}/conditions-contrat`, data);
  }
}
