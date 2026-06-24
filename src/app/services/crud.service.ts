import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ToastService } from './toast.service';
import { CompanyService } from './company.service';

// ─── Standard API envelope types ─────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiPage<T = any> {
  success: boolean;
  data: T[];
  meta: {
    page:  number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  voiture:            'Car',
  reservation:        'Reservation',
  client:             'Client',
  bureau:             'Bureau',
  utilisateur:        'User',
  contrat:            'Contract',
  paiement:           'Payment',
  depense:            'Expense',
  fournisseur:        'Supplier',
  achat:              'Purchase',
  'achat-voiture':    'Purchase',
  vente:              'Sale',
  credit:             'Credit',
  assurance:          'Insurance',
  reparation:         'Repair',
  vidange:            'Oil change',
  vignette:           'Vignette',
  infraction:         'Infraction',
  accessoire:         'Accessory',
  mensualite:         'Installment',
  adblue:             'AdBlue',
  'suivi-technique':  'Technical follow-up',
  'vehicle-credit':   'Financing contract',
  'historique-paiement': 'Payment record',
  'paiement-depense': 'Expense payment',
};

function label(endpoint: string): string {
  const base = endpoint.split('/')[0];
  return LABELS[base] ?? (base.charAt(0).toUpperCase() + base.slice(1));
}

/** Unwrap { success, data } or paginated { data, meta } envelopes. Falls back to raw value. */
function unwrap(r: any): any {
  if (r !== null && typeof r === 'object') {
    if (r.success === true && 'data' in r) return r.data;
    if (Array.isArray(r.data) && r.meta && typeof r.meta.total === 'number') return r.data;
  }
  return r;
}

// Endpoints that must NOT receive an automatic bureauId query param
const NO_BUREAU_FILTER = new Set([
  'bureau', 'auth', 'utilisateur', 'parametres', 'email-log',
  'company', 'notification', 'activity-log',
]);

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CrudService {
  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private companyService: CompanyService,
  ) {}

  // ── Read ──────────────────────────────────────────────────────────────────

  /**
   * Generic GET — works with both the old raw-array response and the new
   * { success, data, message } envelope. Transparently unwraps the envelope
   * so callers always receive the payload directly.
   */
  getAll(endpoint: string, params: Record<string, any> = {}): Observable<any> {
    params = this.injectBureau(endpoint, params);
    return this.http
      .get(`${environment.apiUrl}/${endpoint}`, { params })
      .pipe(map(unwrap));
  }

  /**
   * GET with server-side pagination. Expects the new paginated envelope:
   * { success, data: T[], meta: { page, limit, total, pages } }
   * Use this for any endpoint that supports ?page=&limit=
   */
  getPage<T = any>(endpoint: string, params: Record<string, any> = {}): Observable<ApiPage<T>> {
    params = this.injectBureau(endpoint, params);
    return this.http.get<ApiPage<T>>(`${environment.apiUrl}/${endpoint}`, { params });
  }

  /**
   * GET single resource by id. Unwraps envelope automatically.
   */
  getById(endpoint: string, id: number | string): Observable<any> {
    return this.http
      .get(`${environment.apiUrl}/${endpoint}/${id}`)
      .pipe(map(unwrap));
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  create(endpoint: string, data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/${endpoint}`, data).pipe(
      tap({
        next: () => this.toast.show(`${label(endpoint)} created successfully`, 'success'),
        error: (err) => this.toast.show(
          err?.error?.message || `Failed to create ${label(endpoint)}`, 'error'
        ),
      })
    );
  }

  update(endpoint: string, id: number, data: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/${endpoint}/${id}`, data).pipe(
      tap({
        next: () => this.toast.show(`${label(endpoint)} updated successfully`, 'success'),
        error: (err) => this.toast.show(
          err?.error?.message || `Failed to update ${label(endpoint)}`, 'error'
        ),
      })
    );
  }

  remove(endpoint: string, id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/${endpoint}/${id}`).pipe(
      tap({
        next: () => this.toast.show(`${label(endpoint)} deleted`, 'info'),
        error: (err) => this.toast.show(
          err?.error?.message || `Failed to delete ${label(endpoint)}`, 'error'
        ),
      })
    );
  }

  // ── Special actions ───────────────────────────────────────────────────────

  /** POST without auto-toast — caller handles success/error messaging. */
  rawPost(path: string, data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/${path}`, data);
  }

  /** PATCH without auto-toast — caller handles success/error messaging. */
  rawPatch(path: string, id: number, data: any): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/${path}/${id}`, data);
  }

  /** PUT to an arbitrary path — caller handles success/error messaging. */
  rawPut(path: string, data: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/${path}`, data);
  }

  /** DELETE to an arbitrary path — caller handles success/error messaging. */
  rawDelete(path: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/${path}`);
  }

  /** POST with a custom success message. */
  customAction(path: string, data: any, successMsg = 'Done'): Observable<any> {
    return this.http.post(`${environment.apiUrl}/${path}`, data).pipe(
      tap({
        next: () => this.toast.show(successMsg, 'success'),
        error: (err) => this.toast.show(
          err?.error?.error || err?.error?.message || 'Action failed', 'error'
        ),
      })
    );
  }

  /** Upload a file attached to an entity (generic document upload). */
  uploadDocumentFile(docType: string, entityId: number, file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    form.append('type', docType);
    form.append('entityId', String(entityId));
    return this.http.post(`${environment.apiUrl}/document/upload`, form);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private injectBureau(endpoint: string, params: Record<string, any>): Record<string, any> {
    const base = endpoint.split('/')[0];
    const bureauId = this.companyService.getCurrentBureauId();
    if (bureauId && !NO_BUREAU_FILTER.has(base)) {
      return { ...params, bureauId };
    }
    return params;
  }
}
