import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export type LifecycleState =
  | 'brouillon' | 'setup' | 'disponible' | 'reserve' | 'louee'
  | 'maintenance' | 'hors_service' | 'decommissioned' | 'vendu' | 'archive';

interface StateConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
  nextSteps: string[];
}

const STATE_CONFIG: Record<string, StateConfig> = {
  brouillon: {
    label: 'Brouillon',
    color: '#718096', bgColor: '#EDF2F7',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    description: 'Véhicule créé. Complétez toutes les informations requises pour l\'activer.',
    nextSteps: [
      'Renseigner les champs obligatoires (marque, modèle, année)',
      'Enregistrer les détails d\'achat',
      'Assigner une plaque d\'immatriculation',
      'Ajouter les documents de conformité (assurance, vignette, visite)',
    ],
  },
  setup: {
    label: 'En configuration',
    color: '#2F80ED', bgColor: '#EBF5FF',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    description: 'Configuration en cours. Ajoutez les documents de conformité manquants pour activer ce véhicule.',
    nextSteps: [
      'Ajouter une assurance active',
      'Ajouter la vignette pour l\'année en cours',
      'Ajouter une visite technique valide (si véhicule ≥ 3 ans)',
      'Définir le montant de la caution',
    ],
  },
  disponible: {
    label: 'Disponible',
    color: '#27AE60', bgColor: '#F0FFF4',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    description: 'Véhicule pleinement opérationnel et disponible à la location.',
    nextSteps: [
      'Créer une réservation pour commencer à générer des revenus',
    ],
  },
  reserve: {
    label: 'Réservé',
    color: '#9B51E0', bgColor: '#FAF5FF',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    description: 'Véhicule avec une réservation à venir. Préparer pour la remise au client.',
    nextSteps: [
      'Préparer le véhicule pour la livraison à la date de début',
      'Enregistrer la remise pour démarrer la location',
    ],
  },
  louee: {
    label: 'En location',
    color: '#2F80ED', bgColor: '#EBF5FF',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    description: 'Véhicule actuellement chez un client en location active.',
    nextSteps: [
      'Attendre le retour du client',
      'Enregistrer l\'inspection de retour à la restitution',
    ],
  },
  maintenance: {
    label: 'En maintenance',
    color: '#F2994A', bgColor: '#FFF8F0',
    icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
    description: 'Véhicule en réparation, indisponible à la location jusqu\'à la fin des travaux.',
    nextSteps: [
      'Terminer la réparation en cours',
      'Définir la date de fin pour restaurer la disponibilité',
    ],
  },
  hors_service: {
    label: 'Hors service',
    color: '#EB5757', bgColor: '#FFF5F5',
    icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
    description: 'Véhicule bloqué suite à l\'expiration de documents de conformité. Location impossible.',
    nextSteps: [
      'Renouveler l\'assurance expirée',
      'Renouveler la vignette expirée',
      'Planifier et enregistrer une nouvelle visite technique',
    ],
  },
  decommissioned: {
    label: 'Retiré du parc',
    color: '#ED8936', bgColor: '#FFFAF0',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    description: 'Véhicule formellement retiré du parc actif. En attente de finalisation de la vente.',
    nextSteps: [
      'Clôturer les réparations ouvertes',
      'Enregistrer la vente pour finaliser la cession',
    ],
  },
  vendu: {
    label: 'Vendu',
    color: '#718096', bgColor: '#EDF2F7',
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    description: 'Véhicule vendu. Tous les enregistrements sont en lecture seule.',
    nextSteps: [],
  },
  archive: {
    label: 'Archivé',
    color: '#4A5568', bgColor: '#EDF2F7',
    icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
    description: 'Véhicule temporairement retiré du parc. Peut être réactivé par un administrateur.',
    nextSteps: [
      'Contacter un administrateur pour réactiver ce véhicule',
      'S\'assurer que les documents de conformité sont valides avant réactivation',
    ],
  },
};

@Component({
  selector: 'app-lifecycle-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="lp-wrap" [style.border-left-color]="config.color">

  <div class="lp-header">
    <div class="lp-badge" [style.background]="config.bgColor" [style.color]="config.color">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
        <path [attr.d]="config.icon"/>
      </svg>
      <span class="lp-state-label">{{ config.label }}</span>
    </div>

    <div class="lp-desc">{{ config.description }}</div>
  </div>

  <div class="lp-steps" *ngIf="config.nextSteps.length > 0">
    <div class="lp-steps-title">Next steps</div>
    <ul class="lp-steps-list">
      <li *ngFor="let step of config.nextSteps; let i = index" class="lp-step">
        <span class="lp-step-num">{{ i + 1 }}</span>
        {{ step }}
      </li>
    </ul>
  </div>

  <!-- State-specific action hints -->
  <div class="lp-actions" *ngIf="showActionHints">
    <ng-container [ngSwitch]="state">

      <ng-container *ngSwitchCase="'hors_service'">
        <div class="lp-action-hint lp-hint-danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          Véhicule bloqué — renouvelez les documents de conformité pour restaurer la disponibilité
        </div>
      </ng-container>

      <ng-container *ngSwitchCase="'maintenance'">
        <div class="lp-action-hint lp-hint-warn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Réservations bloquées jusqu'à la fin de la réparation en cours
        </div>
      </ng-container>

      <ng-container *ngSwitchCase="'louee'">
        <div class="lp-action-hint lp-hint-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Nouvelles réservations impossibles pendant la location en cours
        </div>
      </ng-container>

      <ng-container *ngSwitchCase="'decommissioned'">
        <div class="lp-action-hint lp-hint-warn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          Véhicule retiré du parc — enregistrez la vente dans l'onglet Cession
        </div>
      </ng-container>

      <ng-container *ngSwitchCase="'vendu'">
        <div class="lp-action-hint lp-hint-neutral">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Ce véhicule a été vendu. Toutes les informations sont en lecture seule.
        </div>
      </ng-container>

      <ng-container *ngSwitchCase="'archive'">
        <div class="lp-action-hint lp-hint-neutral">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Archivé — non disponible à la location. Un administrateur peut le réactiver.
        </div>
      </ng-container>

    </ng-container>
  </div>

</div>
  `,
  styles: [`
.lp-wrap {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #E8EEFA;
  border-left: 3px solid #2F80ED;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.lp-header { display: flex; flex-direction: column; gap: 0.5rem; }

.lp-badge {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.3rem 0.75rem; border-radius: 99px;
  font-size: 0.8rem; font-weight: 700; width: fit-content;
}
.lp-state-label { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.01em; }

.lp-desc { font-size: 0.82rem; color: #4A5568; line-height: 1.45; }

.lp-steps-title {
  font-size: 0.7rem; font-weight: 700; color: #A0AEC0;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.4rem;
}
.lp-steps-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.lp-step { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8rem; color: #4A5568; }
.lp-step-num {
  width: 18px; height: 18px; border-radius: 50%; background: #EDF2F7;
  color: #4A5568; font-size: 0.65rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
}

.lp-action-hint {
  display: flex; align-items: flex-start; gap: 0.5rem;
  font-size: 0.78rem; padding: 0.5rem 0.6rem; border-radius: 8px; line-height: 1.4;
}
.lp-hint-danger  { background: #FFF5F5; color: #C53030; }
.lp-hint-warn    { background: #FFFAF0; color: #975A16; }
.lp-hint-info    { background: #EBF5FF; color: #2B6CB0; }
.lp-hint-neutral { background: #F7FAFC; color: #4A5568; }
  `]
})
export class LifecyclePanelComponent {
  @Input() state: LifecycleState = 'brouillon';

  get config(): StateConfig {
    return STATE_CONFIG[this.state] ?? STATE_CONFIG['brouillon'];
  }

  get showActionHints(): boolean {
    return ['hors_service', 'maintenance', 'louee', 'decommissioned', 'vendu', 'archive'].includes(this.state);
  }
}
