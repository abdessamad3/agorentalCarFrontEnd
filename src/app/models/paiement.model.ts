/**
 * Typed shape for PaiementController's API response — exists because
 * paiement-list.component.ts read a `contratId` field that has never existed
 * on Paiement (post reservation-payment-unification, it's reservationId/
 * creditId only), undetected for an unknown period since everything was `any`.
 */
export interface Paiement {
  id: number;
  montant: string | number;
  datePaiement: string | null;
  statut: 'active' | 'inactive' | 'pending' | 'payee' | 'non_payee' | 'impaye' | 'partiel' | 'en_attente' | 'annulee';
  modePaiement: string | null;
  note: string | null;
  /** A Paiement links to a reservation OR a credit, never both. */
  reservationId: number | null;
  creditId: number | null;
  creePar: number | null;
  creeAu: string | null;
  reservation: {
    id: number;
    total: string | number;
    montantPaye: string | number;
    client: { id: number | null; nom: string | null };
    voiture: { id: number | null; marque: string | null; modele: string | null };
    dateDebut: string | null;
    dateFin: string | null;
  } | null;
}
