import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaiementDepense {
  id: number;
  montant: number;
  datePaiement: string;
  note: string | null;
  paymentType: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  depenseId: number;
  creeAu: string;
}

@Injectable({ providedIn: 'root' })
export class PaiementDepenseService {
  private readonly base = `${environment.apiUrl}/paiement-depense`;

  constructor(private http: HttpClient) {}

  getByDepense(depenseId: number): Observable<PaiementDepense[]> {
    const params = new HttpParams().set('depenseId', depenseId.toString());
    return this.http.get<PaiementDepense[]>(this.base, { params });
  }

  create(payload: { depenseId: number; montant: number; datePaiement: string; note?: string; paymentMethod?: string }): Observable<any> {
    return this.http.post(this.base, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
