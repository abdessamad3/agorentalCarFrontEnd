import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ContratService } from '../../services/contrat.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { environment } from '../../../environments/environment';
import { UploadBtnComponent } from '../../shared/btn/upload-btn.component';

@Component({
  selector: 'app-parametres-societe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UploadBtnComponent],
  templateUrl: './parametres-societe.component.html',
  styleUrls: ['../settings-shared.css', './parametres-societe.component.css']
})
export class ParametresSocieteComponent implements OnInit {
  dir = 'ltr';
  loading = true;
  saving = false;
  error = '';
  logoPreviewUrl: string | null = null;

  raisonSociale = '';
  telephonesStr = '';
  adresse = '';
  rc = '';
  ice = '';
  ifFiscal = '';
  cnss = '';
  email = '';
  website = '';
  whatsapp = '';
  logoPath: string | null = null;

  promoMessageFr = '';
  promoMessageEn = '';
  promoMessageAr = '';
  horairesFr = '';
  horairesEn = '';
  horairesAr = '';
  facebookUrl = '';
  instagramUrl = '';
  tiktokUrl = '';
  nombreClients: number | null = null;
  villesDesservies: number | null = null;

  readonly serverUrl = environment.serverUrl || '';

  constructor(
    private contratService: ContratService,
    private toast: ToastService,
    private ts: TranslationService,
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.contratService.getParametresSociete().subscribe({
      next: (data: any) => {
        this.raisonSociale   = data.raisonSociale ?? '';
        this.telephonesStr   = Array.isArray(data.telephones)
          ? data.telephones.join(', ')
          : (data.telephones ?? '');
        this.adresse         = data.adresse ?? '';
        this.rc              = data.rc ?? '';
        this.ice             = data.ice ?? '';
        this.ifFiscal        = data.ifFiscal ?? '';
        this.cnss            = data.cnss ?? '';
        this.email           = data.email ?? '';
        this.website         = data.website ?? '';
        this.whatsapp        = data.whatsapp ?? '';
        this.logoPath        = data.logoPath ?? null;
        if (this.logoPath) {
          this.logoPreviewUrl = `${this.serverUrl}${this.logoPath}`;
        }
        this.promoMessageFr   = data.promoMessage?.fr ?? '';
        this.promoMessageEn   = data.promoMessage?.en ?? '';
        this.promoMessageAr   = data.promoMessage?.ar ?? '';
        this.horairesFr       = data.horaires?.fr ?? '';
        this.horairesEn       = data.horaires?.en ?? '';
        this.horairesAr       = data.horaires?.ar ?? '';
        this.facebookUrl      = data.facebookUrl ?? '';
        this.instagramUrl     = data.instagramUrl ?? '';
        this.tiktokUrl        = data.tiktokUrl ?? '';
        this.nombreClients    = data.nombreClients ?? null;
        this.villesDesservies = data.villesDesservies ?? null;
        this.loading = false;
      },
      error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
    });
  }

  onLogoChange(file: File) {
    this.contratService.uploadLogo(file).subscribe({
      next: (res: any) => {
        this.logoPath = res.logoPath ?? null;
        this.logoPreviewUrl = this.logoPath ? `${this.serverUrl}${this.logoPath}` : null;
        this.toast.show('Logo mis à jour', 'success');
      },
      error: () => this.toast.show('Erreur upload logo', 'error')
    });
  }

  save() {
    this.saving = true;
    const phones = this.telephonesStr
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    this.contratService.updateParametresSociete({
      raisonSociale: this.raisonSociale,
      telephones:    phones,
      adresse:       this.adresse,
      rc:            this.rc,
      ice:           this.ice,
      ifFiscal:      this.ifFiscal,
      cnss:          this.cnss,
      email:         this.email,
      website:       this.website,
      whatsapp:      this.whatsapp,
      promoMessage: {
        fr: this.promoMessageFr.trim() || null,
        en: this.promoMessageEn.trim() || null,
        ar: this.promoMessageAr.trim() || null,
      },
      horaires: {
        fr: this.horairesFr.trim(),
        en: this.horairesEn.trim(),
        ar: this.horairesAr.trim(),
      },
      facebookUrl:       this.facebookUrl.trim() || null,
      instagramUrl:      this.instagramUrl.trim() || null,
      tiktokUrl:         this.tiktokUrl.trim() || null,
      nombreClients:     this.nombreClients,
      villesDesservies:  this.villesDesservies,
    }).subscribe({
      next: () => {
        this.toast.show('Paramètres enregistrés', 'success');
        this.saving = false;
      },
      error: (err: any) => {
        this.toast.show(err?.error?.message || 'Erreur d\'enregistrement', 'error');
        this.saving = false;
      }
    });
  }
}
