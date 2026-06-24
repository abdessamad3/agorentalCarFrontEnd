/**
 * Classifies a client's outstanding debt (DH) into a presentation-tier risk level.
 * These boundaries are cosmetic only (badge color/label) — distinct from the
 * configurable reservation-blocking threshold (Parametres), which is a separate,
 * per-bureau business rule rather than a fixed display tier.
 */
export type DebtRiskLevel = 'none' | 'low' | 'medium' | 'high';

export function debtRiskLevel(debt: number | null | undefined): DebtRiskLevel {
  const d = debt ?? 0;
  if (d <= 0) return 'none';
  if (d < 1000) return 'low';
  if (d < 5000) return 'medium';
  return 'high';
}

export function debtRiskClass(debt: number | null | undefined): string {
  return 'debt-risk-' + debtRiskLevel(debt);
}
