/**
 * Classifies a ComplianceService status string into one of four severity tiers.
 * This is the part that's been independently reimplemented (inconsistently —
 * mixed uppercase/lowercase comparisons) across 7+ components, and the part that
 * actually breaks whenever the status vocabulary changes (proven this session
 * when UPCOMING was added: 3 components had to be individually found and fixed).
 *
 * Each consumer still maps severity -> its own CSS class / score / label, since
 * that mapping legitimately differs per UI context — only the classification
 * step (which bucket a status falls into) is centralized here.
 */
export type ComplianceSeverity = 'ok' | 'warning' | 'danger' | 'neutral';

export function complianceSeverity(status: string | null | undefined): ComplianceSeverity {
  const s = (status || '').toUpperCase();
  if (s === 'VALID' || s === 'UPCOMING') return 'ok';
  if (s === 'WARNING') return 'warning';
  if (s === 'CRITICAL' || s === 'EXPIRED') return 'danger';
  return 'neutral'; // UNKNOWN, NOT_REQUIRED, or unrecognized — callers that want
                     // NOT_REQUIRED treated as "ok" (e.g. a compliance score) should
                     // check `status === 'NOT_REQUIRED'` explicitly before/alongside
                     // this classifier, since existing consumers disagree on whether
                     // "not required yet" should display as good or neutral.
}

/**
 * 0-100 compliance score for a vehicle, averaging assurance/vignette/visite
 * severity (NOT_REQUIRED sections excluded so a young car isn't penalized for
 * not yet needing a technical inspection). Falls back to docAlerts-derived
 * scoring if `compliance` isn't available. Extracted from
 * voiture-detail.component.ts so overview-tab.component.ts can use the exact
 * same calculation instead of a second, independently-drifting copy.
 */
export function complianceScore(
  compliance: { vignette?: { status?: string }; assurance?: { status?: string }; visite?: { status?: string } } | null | undefined,
  docAlerts: { level: 'danger' | 'warning' | '' }[],
): number {
  if (compliance) {
    const scoreOf = (s?: string): number | null => {
      const sev = complianceSeverity(s);
      if (sev === 'danger')  return 0;
      if (sev === 'warning') return 50;
      if (sev === 'ok')      return 100;
      return null; // neutral: NOT_REQUIRED or UNKNOWN, excluded from the average
    };
    const raw = [scoreOf(compliance.vignette?.status), scoreOf(compliance.assurance?.status), scoreOf(compliance.visite?.status)]
      .filter((v): v is number => v !== null);
    if (!raw.length) return 100;
    return Math.round(raw.reduce((a, b) => a + b, 0) / raw.length);
  }
  if (!docAlerts.length) return 100;
  const scores: number[] = docAlerts.map(d => d.level === 'danger' ? 0 : d.level === 'warning' ? 50 : 100);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
