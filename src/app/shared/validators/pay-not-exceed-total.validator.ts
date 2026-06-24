import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Cross-field validator: rejects a form where the paid amount exceeds the total.
 * Was independently reimplemented in vignette-form, vignette-modal, documents-tab,
 * and insurance-modal — same logic, four copies. Field names are configurable
 * since some forms use montant/montantPaye and others a different pair.
 */
export function payNotExceedTotal(
  totalField = 'montant',
  paidField = 'montantPaye',
): (g: AbstractControl) => ValidationErrors | null {
  return (g: AbstractControl): ValidationErrors | null => {
    const total = +(g.get(totalField)?.value ?? 0);
    const paid  = +(g.get(paidField)?.value  ?? 0);
    return total > 0 && paid > total ? { exceedsTotal: true } : null;
  };
}
