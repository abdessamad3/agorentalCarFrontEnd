import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const LOGO_KEY      = 'company_logo';
const NAME_KEY      = 'company_name';
const BUREAU_ID_KEY = 'company_bureau_id';

export interface BureauOption { id: number; nom: string; }

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

  getCurrentLogo(): string | null     { return this.logoSrc.getValue(); }
  getCurrentName(): string            { return this.companyName.getValue(); }
  getCurrentBureauId(): number | null { return this.bureauId.getValue(); }
  getBureaux(): BureauOption[]        { return this.bureauxList.getValue(); }

  setBureaux(list: BureauOption[]) {
    this.bureauxList.next(list);
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

  setCurrentBureau(id: number | null, name?: string, logo?: string | null) {
    id !== null
      ? localStorage.setItem(BUREAU_ID_KEY, id.toString())
      : localStorage.removeItem(BUREAU_ID_KEY);
    this.bureauId.next(id);
    if (name !== undefined) this.setCompanyName(name);
    if (logo !== undefined) this.setLogo(logo);
  }
}
