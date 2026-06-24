import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ContratService } from '../../services/contrat.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-conditions-contrat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './conditions-contrat.component.html',
  styleUrls: ['../settings-shared.css', './conditions-contrat.component.css']
})
export class ConditionsContratComponent implements OnInit {
  dir = 'ltr';
  loading = true;
  saving = false;
  error = '';

  texteFrancais = '';
  texteArabe = '';

  constructor(
    private contratService: ContratService,
    private toast: ToastService,
    private ts: TranslationService,
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.contratService.getConditionsContrat().subscribe({
      next: (data: any) => {
        this.texteFrancais = data.texteFrancais ?? '';
        this.texteArabe    = data.texteArabe ?? '';
        this.loading = false;
      },
      error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
    });
  }

  save() {
    this.saving = true;
    this.contratService.updateConditionsContrat({
      texteFrancais: this.texteFrancais,
      texteArabe:    this.texteArabe,
    }).subscribe({
      next: () => {
        this.toast.show('Conditions enregistrées', 'success');
        this.saving = false;
      },
      error: (err: any) => {
        this.toast.show(err?.error?.message || 'Erreur d\'enregistrement', 'error');
        this.saving = false;
      }
    });
  }
}
