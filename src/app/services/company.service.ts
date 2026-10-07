import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

const LOGO_KEY      = 'company_logo';
const NAME_KEY      = 'company_name';
const BUREAU_ID_KEY = 'company_bureau_id';

export interface BureauOption {
  id: number; nom: string; adresse?: string; telephone?: string;
  companyId?: number | null; companyNom?: string | null; companyLogo?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private logoSrc     = new BehaviorSubject<string | null>(this.loadLogo());
  private companyName = new BehaviorSubject<string>(localStorage.getItem(NAME_KEY) || 'AGOCAR');
  private bureauId    = new BehaviorSubject<number | null>(this.loadBureauId());
  private bureauxList = new BehaviorSubject<BureauOption[]>([]);

  logo$        = this.logoSrc.asObservable();
  companyName$ = this.companyName.asObservable();
  bureauId$    = this.bureauId.asObservable();
  bureaux$     = this.bureauxList.asObservable();

  private loadLogo(): string | null {
    const stored = localStorage.getItem(LOGO_KEY);
    if (stored?.startsWith('data:')) {
      localStorage.removeItem(LOGO_KEY);
      return null;
    }
    return stored;
  }

  private loadBureauId(): number | null {
    const stored = localStorage.getItem(BUREAU_ID_KEY);
    return stored ? parseInt(stored, 10) : null;
  }

  constructor(private http: HttpClient) {}

  getCurrentLogo(): string | null     { return this.logoSrc.getValue(); }
  getCurrentName(): string            { return this.companyName.getValue(); }
  getCurrentBureauId(): number | null { return this.bureauId.getValue(); }
  getBureaux(): BureauOption[]        { return this.bureauxList.getValue(); }

  getCurrentBureau(): BureauOption | null {
    const id = this.bureauId.getValue();
    return id != null ? (this.bureauxList.getValue().find(b => b.id === id) ?? null) : null;
  }

  getCurrentBureauAdresse(): string { return this.getCurrentBureau()?.adresse ?? ''; }
  getCurrentBureauTelephone(): string { return this.getCurrentBureau()?.telephone ?? ''; }

  setBureaux(list: BureauOption[]) {
    this.bureauxList.next(list);
    this.applyBrandingForCurrentBureau();
  }

  updateBureauName(id: number, nom: string) {
    const updated = this.bureauxList.getValue().map(b => b.id === id ? { ...b, nom } : b);
    this.bureauxList.next(updated);
  }

  setLogo(url: string | null) {
    url ? localStorage.setItem(LOGO_KEY, url) : localStorage.removeItem(LOGO_KEY);
    this.logoSrc.next(url);
  }

  setCompanyName(name: string) {
    localStorage.setItem(NAME_KEY, name);
    this.companyName.next(name);
  }

  setCurrentBureau(id: number | null) {
    id !== null
      ? localStorage.setItem(BUREAU_ID_KEY, id.toString())
      : localStorage.removeItem(BUREAU_ID_KEY);
    this.bureauId.next(id);
    this.applyBrandingForCurrentBureau();
  }

  /** Re-fetches every bureau (with its company's name/logo) and re-derives
   * branding for whichever bureau is currently active. Call this after
   * anything that could change a company's identity (editing it, switching
   * bureau) so branding never relies on stale cached data. */
  refreshBureaux(): void {
    this.http.get<any>(`${environment.apiUrl}/bureau`).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        this.setBureaux(list.map((b: any) => ({
          id: b.id, nom: b.nom, adresse: b.adresse ?? '', telephone: b.telephone ?? '',
          companyId: b.companyId ?? null,
          companyNom: b.companyNom ?? null,
          companyLogo: b.companyLogo
            ? (String(b.companyLogo).startsWith('http') ? b.companyLogo : `${environment.serverUrl}${b.companyLogo}`)
            : null,
        })));
      }
    });
  }

  /** Branding reflects whichever company owns the currently active bureau.
   * No bureau selected: auto-pick the only one if there's just a single
   * bureau (nothing to actually choose between), otherwise neutral default
   * for an admin genuinely viewing across multiple bureaus/companies. */
  private applyBrandingForCurrentBureau(): void {
    const id = this.bureauId.getValue();
    const list = this.bureauxList.getValue();
    let bureau = id != null ? list.find(b => b.id === id) : null;

    if (!bureau && id == null && list.length === 1) {
      bureau = list[0];
      this.bureauId.next(bureau.id);
      localStorage.setItem(BUREAU_ID_KEY, bureau.id.toString());
    }

    if (bureau) {
      this.setCompanyName(bureau.companyNom || 'AGOCAR');
      this.setLogo(bureau.companyLogo ?? null);
    } else if (id == null) {
      this.setCompanyName('AGOCAR');
      this.setLogo(null);
    }
  }
}
