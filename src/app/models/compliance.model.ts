/**
 * Typed shapes for the Assurance/Vignette/SuiviTechnique API responses.
 *
 * These exist because this exact gap caused real bugs this session: with
 * everything typed `any`, nothing caught compliance-center.component.ts
 * reading `s.prochainDate`/`s.dateProchaine` (SuiviTechniqueController has
 * never returned either — the real field is `dateFin`), or `v.kmSuivant`
 * (the real field is `kilometrageSuivant`). A typed response would have
 * flagged both as compile errors instead of silently-wrong runtime behavior.
 *
 * Field names match the exact `serialize()` output of AssuranceController,
 * VignetteController, and SuiviTechniqueController — verified against the
 * backend source, not guessed.
 */

export type ComplianceStatus =
  | 'active' | 'upcoming' | 'expired' | 'cancelled' | 'archived' // Assurance
  | 'VALID' | 'WARNING' | 'CRITICAL' | 'EXPIRED' | 'UPCOMING' | 'NOT_REQUIRED' | 'UNKNOWN'; // ComplianceService

export type PaymentStatut = 'paid' | 'partial' | 'unpaid';

interface ComplianceDepenseFields {
  depenseId: number | null;
  voitureId: number | null;
  voiture: string;
  montant: string | number | null;
  montantTotal: number;
  montantPaye: number;
  reste: number;
  paymentStatut: PaymentStatut;
  paiementCount: number;
  creeAu: string | null;
  dateFacture: string | null;
  filePath: string | null;
}

export interface Assurance extends ComplianceDepenseFields {
  id: number;
  dateDebut: string | null;
  dateFin: string | null;
  compagnie: string | null;
  typeAssurance: string | null;
  numeroContrat: string | null;
  archivedAt: string | null;
  cancelledAt: string | null;
  status: ComplianceStatus;
  notes: string | null;
}

export interface Vignette extends ComplianceDepenseFields {
  id: number;
  annee: number;
  dateLimite: string | null;
  datePaiement: string | null;
}

export interface SuiviTechnique extends ComplianceDepenseFields {
  id: number;
  dateReglages: string | null;
  date: string | null;
  /** The actual expiry field — NOT `prochainDate`/`dateProchaine`, which don't exist on this entity. */
  dateFin: string | null;
  resultat: 'favorable' | 'favorable_avec_reserve' | 'defavorable' | null;
}

export interface Vidange extends ComplianceDepenseFields {
  id: number;
  /** The actual next-service-mileage field — NOT `kmSuivant`, which doesn't exist on this entity. */
  kilometrageSuivant: number | null;
  intervalleKm: number;
  filtreAir: boolean;
  filtreHuile: boolean;
  filtreCarburant: boolean;
  date: string | null;
  /**
   * Vidange has no "next due date" field at all — only kilometrageSuivant
   * (next due km). Any code reading a date-based expiry for oil changes is
   * reading a field that doesn't exist.
   */
}
