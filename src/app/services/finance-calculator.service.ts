import { Injectable } from '@angular/core';

export interface LoanInputs {
  prixAchat:  number;
  apport:     number;
  mensualite: number;
  dureeMois:  number;
}

export interface RateResult {
  monthlyRate:       number; // raw r, e.g. 0.005
  annualNominalRate: number; // r × 12 × 100 (%)
  effectiveAPR:      number; // ((1+r)^12 − 1) × 100 (%)
}

export interface LoanResult {
  prixAchat:            number;
  apport:               number;
  amountFinanced:       number; // prixAchat − apport
  loanRepayment:        number; // mensualite × dureeMois
  interestPaid:         number; // loanRepayment − amountFinanced
  totalAcquisitionCost: number; // apport + loanRepayment
  rates:                RateResult;
  isValid:              boolean;
  errors:               string[];
}

@Injectable({ providedIn: 'root' })
export class FinanceCalculatorService {

  calculateAmountFinanced(prixAchat: number, apport: number): number {
    return Math.max(0, prixAchat - apport);
  }

  calculateLoanRepayment(mensualite: number, dureeMois: number): number {
    return mensualite * dureeMois;
  }

  calculateInterestPaid(loanRepayment: number, amountFinanced: number): number {
    return Math.max(0, loanRepayment - amountFinanced);
  }

  calculateTotalAcquisitionCost(apport: number, loanRepayment: number): number {
    return apport + loanRepayment;
  }

  /**
   * Newton-Raphson iteration on the standard loan amortization equation:
   *   PMT = P × r × (1+r)^n / ((1+r)^n − 1)
   * Solves for the monthly rate r given principal P, payment PMT, and term n.
   * Returns the raw monthly rate (not a percentage).
   */
  calculateMonthlyInterestRate(amountFinanced: number, mensualite: number, dureeMois: number): number {
    if (amountFinanced <= 0 || mensualite <= 0 || dureeMois <= 0) return 0;
    if (mensualite * dureeMois <= amountFinanced) return 0;
    let r = 0.01;
    for (let i = 0; i < 200; i++) {
      const pow  = Math.pow(1 + r, dureeMois);
      const powP = Math.pow(1 + r, dureeMois + 1);
      const powM = Math.pow(1 + r, dureeMois - 1);
      const f    = amountFinanced * r * pow / (pow - 1) - mensualite;
      const fp   = amountFinanced * powM * (powP - 1 - r * (dureeMois + 1)) / Math.pow(pow - 1, 2);
      if (Math.abs(fp) < 1e-15) break;
      const rNew  = r - f / fp;
      const rSafe = rNew <= 0 ? r / 2 : rNew;
      if (Math.abs(rSafe - r) < 1e-10) { r = rSafe; break; }
      r = rSafe;
    }
    return r > 0 ? r : 0;
  }

  /** Taux Annuel Nominal: r × 12, as a percentage. */
  calculateAnnualNominalRate(monthlyRate: number): number {
    return Math.round(monthlyRate * 12 * 10000) / 100;
  }

  /** Taux Effectif Global / APR: (1+r)^12 − 1, as a percentage. */
  calculateEffectiveAPR(monthlyRate: number): number {
    return Math.round((Math.pow(1 + monthlyRate, 12) - 1) * 10000) / 100;
  }

  validateLoan(inputs: LoanInputs): string[] {
    const errors: string[] = [];
    const { prixAchat, apport, mensualite, dureeMois } = inputs;
    if (prixAchat <= 0) {
      errors.push("Le prix d'achat doit être supérieur à 0.");
    }
    if (apport < 0) {
      errors.push("L'apport ne peut pas être négatif.");
    }
    if (prixAchat > 0 && apport >= prixAchat) {
      errors.push("L'apport ne peut pas être supérieur ou égal au prix d'achat.");
    }
    if (mensualite <= 0) {
      errors.push('La mensualité doit être supérieure à 0.');
    }
    if (dureeMois <= 0) {
      errors.push('La durée doit être supérieure à 0 mois.');
    }
    if (errors.length === 0) {
      const financed = Math.max(0, prixAchat - apport);
      if (mensualite * dureeMois <= financed) {
        errors.push('Le total des mensualités ne couvre pas le montant financé — vérifiez la mensualité et la durée.');
      }
    }
    return errors;
  }

  calculate(inputs: LoanInputs): LoanResult {
    const { prixAchat, apport, mensualite, dureeMois } = inputs;
    const errors = this.validateLoan(inputs);

    const amountFinanced       = this.calculateAmountFinanced(prixAchat, apport);
    const loanRepayment        = this.calculateLoanRepayment(mensualite, dureeMois);
    const interestPaid         = this.calculateInterestPaid(loanRepayment, amountFinanced);
    const totalAcquisitionCost = this.calculateTotalAcquisitionCost(apport, loanRepayment);

    const monthlyRate       = errors.length === 0
      ? this.calculateMonthlyInterestRate(amountFinanced, mensualite, dureeMois)
      : 0;
    const annualNominalRate = this.calculateAnnualNominalRate(monthlyRate);
    const effectiveAPR      = this.calculateEffectiveAPR(monthlyRate);

    return {
      prixAchat,
      apport,
      amountFinanced,
      loanRepayment,
      interestPaid,
      totalAcquisitionCost,
      rates: { monthlyRate, annualNominalRate, effectiveAPR },
      isValid: errors.length === 0,
      errors,
    };
  }
}
