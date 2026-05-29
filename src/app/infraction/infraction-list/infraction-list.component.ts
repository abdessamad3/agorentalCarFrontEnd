import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';

interface InfractionOption {
  value: string;
  fr: string;
  en: string;
  ar: string;
}

@Component({
  selector: 'app-infraction-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './infraction-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class InfractionListComponent implements OnInit {
  items: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  modalMode: 'view' | 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false; deleteId: number | null = null; isEditing = false;
  customDescription = '';
  readonly endpoint = 'infraction';
  readonly objectEntries = Object.entries;

  readonly infractionTypes: InfractionOption[] = [
    { value: 'Excès de vitesse en agglomération',    fr: 'Excès de vitesse en agglomération',    en: 'Speeding in urban area',              ar: 'تجاوز السرعة داخل المدن' },
    { value: 'Excès de vitesse hors agglomération',  fr: 'Excès de vitesse hors agglomération',  en: 'Speeding outside urban area',         ar: 'تجاوز السرعة خارج المدن' },
    { value: 'Grillage de feu rouge',                fr: 'Grillage de feu rouge',                en: 'Running a red light',                 ar: 'تجاوز إشارة المرور الحمراء' },
    { value: 'Non-respect du panneau Stop',          fr: 'Non-respect du panneau Stop',          en: 'Ignoring stop sign',                  ar: 'عدم احترام إشارة التوقف' },
    { value: 'Non-respect de la priorité',           fr: 'Non-respect de la priorité',           en: 'Failure to yield',                    ar: 'عدم احترام الأولوية' },
    { value: 'Non-port de la ceinture de sécurité', fr: 'Non-port de la ceinture de sécurité',  en: 'Not wearing seatbelt',                ar: 'عدم ارتداء حزام الأمان' },
    { value: 'Usage du téléphone au volant',         fr: 'Usage du téléphone au volant',         en: 'Using phone while driving',           ar: 'استخدام الهاتف أثناء القيادة' },
    { value: "Conduite en état d'ivresse",           fr: "Conduite en état d'ivresse",           en: 'Driving under the influence',         ar: 'القيادة في حالة سكر' },
    { value: 'Dépassement dangereux',                fr: 'Dépassement dangereux',                en: 'Dangerous overtaking',                ar: 'تجاوز خطير' },
    { value: 'Circulation à contresens',             fr: 'Circulation à contresens',             en: 'Wrong-way driving',                   ar: 'السير في الاتجاه المعاكس' },
    { value: 'Stationnement interdit',               fr: 'Stationnement interdit',               en: 'Illegal parking',                     ar: 'الوقوف في مكان ممنوع' },
    { value: 'Non-respect des feux de signalisation',fr: 'Non-respect des feux de signalisation',en: 'Traffic light violation',             ar: 'عدم احترام إشارات المرور' },
    { value: 'Défaut de permis de conduire',         fr: 'Défaut de permis de conduire',         en: 'No valid driver\'s license',          ar: 'غياب رخصة السياقة' },
    { value: "Défaut d'assurance",                   fr: "Défaut d'assurance",                   en: 'No valid insurance',                  ar: 'غياب التأمين' },
    { value: 'Défaut de contrôle technique',         fr: 'Défaut de contrôle technique',         en: 'No valid technical inspection',       ar: 'غياب الفحص التقني' },
    { value: "Défaut de plaque d'immatriculation",   fr: "Défaut de plaque d'immatriculation",   en: 'Missing license plate',               ar: 'غياب لوحة الترقيم' },
    { value: 'Fuite après accident',                 fr: 'Fuite après accident',                 en: 'Hit and run',                         ar: 'الفرار بعد حادثة' },
    { value: 'Non-port du casque (deux-roues)',      fr: 'Non-port du casque (deux-roues)',      en: 'Not wearing helmet (two-wheelers)',    ar: 'عدم ارتداء الخوذة (ذوو العجلتين)' },
    { value: 'Surcharge de passagers',               fr: 'Surcharge de passagers',               en: 'Overloaded passengers',               ar: 'تجاوز عدد الركاب المسموح به' },
    { value: 'Autre infraction',                     fr: 'Autre infraction',                     en: 'Other violation',                     ar: 'مخالفة أخرى' },
  ];

  get infractionOptions(): { value: string; label: string }[] {
    const lang = this.ts.getCurrentLanguage() as 'fr' | 'en' | 'ar';
    return this.infractionTypes.map(i => ({ value: i.value, label: i[lang] || i.fr }));
  }

  get isOtherSelected(): boolean {
    return this.form.get('description')?.value === 'Autre infraction';
  }

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      reservationId: [null],
      description:   [''],
      date:          [''],
      montant:       [0, Validators.min(0)],
      statut:        ['en_attente']
    });
  }

  ngOnInit() { this.ts.direction$.subscribe(d => this.dir = d); this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.crud.getAll(this.endpoint).subscribe({
      next: r => { this.items = Array.isArray(r) ? r : (r?.data ?? []); this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  get filtered() {
    if (!this.search.trim()) return this.items;
    const q = this.search.toLowerCase();
    return this.items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(q)));
  }

  openView(item: any)    { this.selected = item; this.modalMode = 'view'; }
  openAdd()              { this.selected = null; this.isEditing = false; this.customDescription = ''; this.form.reset({ montant: 0, statut: 'en_attente' }); this.modalMode = 'form'; }
  openEdit(item: any)    {
    this.selected = item; this.isEditing = true; this.customDescription = '';
    const desc = item.description || item.type || '';
    const isKnown = this.infractionTypes.some(i => i.value === desc);
    this.form.patchValue({
      reservationId: item.reservationId ?? null,
      description:   isKnown ? desc : 'Autre infraction',
      date:          item.date || item.dateSaisie || '',
      montant:       item.montant || item.prix || 0,
      statut:        item.statut || 'en_attente',
    });
    if (!isKnown && desc) this.customDescription = desc;
    this.modalMode = 'form';
  }
  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }
  closeModal()           { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; this.isEditing = false; this.customDescription = ''; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  save() {
    if (this.form.invalid) return;
    if (this.isOtherSelected && !this.customDescription.trim()) return;
    this.isSubmitting = true;
    const payload = { ...this.form.value };
    if (this.isOtherSelected) payload.description = this.customDescription.trim();
    const req = this.isEditing
      ? this.crud.update(this.endpoint, this.selected.id, payload)
      : this.crud.create(this.endpoint, payload);
    req.subscribe({ next: () => { this.closeModal(); this.load(); }, error: () => { this.isSubmitting = false; } });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove(this.endpoint, this.deleteId).subscribe({ next: () => { this.closeModal(); this.load(); }, error: () => this.closeModal() });
  }

  displayValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }
}
