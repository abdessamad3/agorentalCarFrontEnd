import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';

interface FinancialInstitution {
  id: number;
  name: string;
  type: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  status: string;
  createdAt?: string;
}

@Component({
  selector: 'app-financial-institution',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financial-institution.component.html',
  styleUrls: ['../../shared/styles/reports.css'],
})
export class FinancialInstitutionComponent implements OnInit {
  loading = false;
  saving  = false;
  dir = 'ltr';

  items: FinancialInstitution[] = [];
  search = '';
  showModal = false;
  editId: number | null = null;

  form: Partial<FinancialInstitution> = {};

  readonly types = [
    { value: 'bank',         label: 'Bank' },
    { value: 'leasing',      label: 'Leasing Company' },
    { value: 'credit',       label: 'Credit Company' },
    { value: 'manufacturer', label: 'Manufacturer Financing' },
    { value: 'other',        label: 'Other' },
  ];

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    this.crud.getAll('financial-institution').subscribe({
      next: (res: any) => {
        this.items  = Array.isArray(res) ? res : (res?.data ?? []);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get filtered(): FinancialInstitution[] {
    const q = this.search.toLowerCase();
    return q
      ? this.items.filter(i =>
          i.name.toLowerCase().includes(q) ||
          (i.contactPerson ?? '').toLowerCase().includes(q) ||
          (i.email ?? '').toLowerCase().includes(q)
        )
      : this.items;
  }

  openCreate() {
    this.editId = null;
    this.form   = { type: 'bank', status: 'active' };
    this.showModal = true;
  }

  openEdit(item: FinancialInstitution) {
    this.editId = item.id;
    this.form   = { ...item };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.form = {};
    this.editId = null;
  }

  save() {
    if (!this.form.name || !this.form.type) return;
    this.saving = true;

    const req = this.editId
      ? this.crud.update('financial-institution', this.editId, this.form)
      : this.crud.create('financial-institution', this.form);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.load();
      },
      error: () => { this.saving = false; },
    });
  }

  toggleStatus(item: FinancialInstitution) {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    this.crud.update('financial-institution', item.id, { status: newStatus }).subscribe(() => this.load());
  }

  typeLabel(type: string): string {
    return this.types.find(t => t.value === type)?.label ?? type;
  }

  typeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      bank: 'sc-blue', leasing: 'sc-purple', credit: 'sc-orange',
      manufacturer: 'sc-green', other: 'sc-teal',
    };
    return map[type] ?? 'sc-teal';
  }
}
