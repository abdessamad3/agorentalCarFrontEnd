import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { PAGE_SIZE } from '../../shared/constants/pagination';

interface ClientRef {
  id: number;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  email: string | null;
}

interface DuplicateFlag {
  id: number;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  email: string | null;
  cin: string | null;
  passeport: string | null;
  creeAu: string | null;
  matchedClient: ClientRef | null;
}

/** Standing list of clients flagged as a possible duplicate (CIN/passport match
 *  at public-booking time) that nobody has resolved yet -- durable so a flag
 *  never relies on being caught in the moment on the email/dashboard/reservation
 *  page. See the client dedup design: merge is manager/admin-only, dismiss (keep
 *  separate) is open to any staff since it's the safe, non-destructive default. */
@Component({
  selector: 'app-client-duplicate-list',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginatorComponent],
  templateUrl: './client-duplicate-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './client-duplicate-list.component.css'],
})
export class ClientDuplicateListComponent implements OnInit {
  readonly endpoint = 'client-duplicates';
  readonly limit = PAGE_SIZE;

  items: DuplicateFlag[] = [];
  loading = true;
  error = '';
  dir = 'ltr';

  page = 1;
  total = 0;

  resolvingId: number | null = null;

  get canMerge(): boolean {
    return this.auth.hasRole('ROLE_ADMIN') || this.auth.hasRole('ROLE_MANAGER');
  }

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private auth: AuthService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.crud.getPage<DuplicateFlag>(this.endpoint, { page: this.page }).subscribe({
      next: r => {
        this.items = r.data ?? [];
        this.total = r.meta?.total ?? this.items.length;
        this.loading = false;
      },
      error: () => { this.error = this.t('loadError'); this.loading = false; },
    });
  }

  onPageChange(p: number) { this.page = p; this.load(); }

  resolve(item: DuplicateFlag, action: 'merge' | 'dismiss') {
    if (this.resolvingId) return;
    if (action === 'merge' && !confirm(this.t('confirmMergeClients'))) return;

    this.resolvingId = item.id;
    this.crud.rawPost(`${this.endpoint}/${item.id}/resolve`, { action }).subscribe({
      next: () => {
        this.resolvingId = null;
        this.toast.show(action === 'merge' ? this.t('clientsMerged') : this.t('duplicateDismissed'), 'success');
        this.load();
      },
      error: (err: any) => {
        this.resolvingId = null;
        this.toast.show(err?.error?.error ?? this.t('error'), 'error');
      },
    });
  }

  fullName(c: { nom: string; prenom: string | null } | ClientRef): string {
    return [c.prenom, c.nom].filter(Boolean).join(' ').trim() || c.nom;
  }

  t(key: string) { return this.ts.translate(key); }
}
