// ─── Vehicle ─────────────────────────────────────────────────────────────────

const VEHICLE_CLASS: Record<string, string> = {
  brouillon:      'st-draft',
  setup:          'st-setup',
  disponible:     'st-green',
  reserve:        'st-teal',
  louee:          'st-blue',
  maintenance:    'st-orange',
  hors_service:   'st-red',
  decommissioned: 'st-brown',
  vendu:          'st-gray',
  archive:        'st-dark',
};

const VEHICLE_LABEL: Record<string, Record<string, string>> = {
  fr: {
    brouillon:      'Brouillon',
    setup:          'Setup',
    disponible:     'Disponible',
    reserve:        'Réservé',
    louee:          'Louée',
    maintenance:    'Maintenance',
    hors_service:   'Hors Service',
    decommissioned: 'Déclassé',
    vendu:          'Vendu',
    archive:        'Archivé',
  },
  en: {
    brouillon:      'Draft',
    setup:          'Setup',
    disponible:     'Available',
    reserve:        'Reserved',
    louee:          'Rented',
    maintenance:    'Maintenance',
    hors_service:   'Out of Service',
    decommissioned: 'Decommissioned',
    vendu:          'Sold',
    archive:        'Archived',
  },
  ar: {
    brouillon:      'مسودة',
    setup:          'إعداد',
    disponible:     'متاح',
    reserve:        'محجوز',
    louee:          'مؤجرة',
    maintenance:    'صيانة',
    hors_service:   'خارج الخدمة',
    decommissioned: 'مسحوب',
    vendu:          'مبيع',
    archive:        'مؤرشف',
  },
};

export function vehicleStatusClass(s: string | null | undefined): string {
  return VEHICLE_CLASS[(s ?? '').toLowerCase()] ?? 'st-gray';
}

export function vehicleStatusLabel(s: string | null | undefined, lang = 'fr'): string {
  const key = (s ?? '').toLowerCase();
  return (VEHICLE_LABEL[lang] ?? VEHICLE_LABEL['fr'])[key] ?? (s ?? '—');
}

// ─── Reservation ─────────────────────────────────────────────────────────────

const RESERVATION_CLASS: Record<string, string> = {
  confirmed:           'chip-confirmed',
  confirmee:           'chip-confirmed',
  en_cours:            'chip-active',
  terminee:            'chip-done',
  annulee:             'chip-cancelled',
  termine_avant_terme: 'chip-terminated',
  en_attente:          'chip-pending',
};

const RESERVATION_LABEL: Record<string, Record<string, string>> = {
  fr: {
    confirmed:           'Confirmée',
    confirmee:           'Confirmée',
    en_cours:            'En cours',
    terminee:            'Terminée',
    annulee:             'Annulée',
    termine_avant_terme: 'Terminé avant terme',
    en_attente:          'En attente',
  },
  en: {
    confirmed:           'Confirmed',
    confirmee:           'Confirmed',
    en_cours:            'In Progress',
    terminee:            'Completed',
    annulee:             'Cancelled',
    termine_avant_terme: 'Early Termination',
    en_attente:          'Pending',
  },
  ar: {
    confirmed:           'مؤكدة',
    confirmee:           'مؤكدة',
    en_cours:            'جارية',
    terminee:            'منتهية',
    annulee:             'ملغاة',
    termine_avant_terme: 'إنهاء مبكر',
    en_attente:          'في الانتظار',
  },
};

export function reservationStatusClass(s: string | null | undefined): string {
  return RESERVATION_CLASS[(s ?? '').toLowerCase()] ?? '';
}

export function reservationStatusLabel(s: string | null | undefined, lang = 'fr'): string {
  const key = (s ?? '').toLowerCase();
  return (RESERVATION_LABEL[lang] ?? RESERVATION_LABEL['fr'])[key] ?? (s ?? '—');
}

// ─── Payment ─────────────────────────────────────────────────────────────────

const PAYMENT_CLASS: Record<string, string> = {
  payee:      'chip-pay-paid',
  paid:       'chip-pay-paid',
  partiel:    'chip-pay-partial',
  partial:    'chip-pay-partial',
  en_attente: 'chip-pay-unpaid',
  pending:    'chip-pay-unpaid',
  impaye:     'chip-pay-unpaid',
  non_payee:  'chip-pay-unpaid',
  unpaid:     'chip-pay-unpaid',
  annulee:    'chip-pay-cancelled',
  annule:     'chip-pay-cancelled',
  due_soon:   'chip-pay-partial',
  due_today:  'chip-pay-partial',
  overdue:    'chip-pay-unpaid',
};

const PAYMENT_LABEL: Record<string, Record<string, string>> = {
  fr: {
    payee:      'Payée',
    paid:       'Payée',
    partiel:    'Partiel',
    partial:    'Partiel',
    en_attente: 'En attente',
    pending:    'En attente',
    impaye:     'Impayé',
    non_payee:  'Non payée',
    unpaid:     'Impayé',
    annulee:    'Annulée',
    annule:     'Annulé',
    due_soon:   'Bientôt dû',
    due_today:  "Dû aujourd'hui",
    overdue:    'En retard',
  },
  en: {
    payee:      'Paid',
    paid:       'Paid',
    partiel:    'Partial',
    partial:    'Partial',
    en_attente: 'Pending',
    pending:    'Pending',
    impaye:     'Unpaid',
    non_payee:  'Unpaid',
    unpaid:     'Unpaid',
    annulee:    'Cancelled',
    annule:     'Cancelled',
    due_soon:   'Due Soon',
    due_today:  'Due Today',
    overdue:    'Overdue',
  },
  ar: {
    payee:      'مدفوعة',
    paid:       'مدفوعة',
    partiel:    'جزئي',
    partial:    'جزئي',
    en_attente: 'في الانتظار',
    pending:    'في الانتظار',
    impaye:     'غير مدفوع',
    non_payee:  'غير مدفوعة',
    unpaid:     'غير مدفوع',
    annulee:    'ملغاة',
    annule:     'ملغى',
    due_soon:   'مستحق قريباً',
    due_today:  'مستحق اليوم',
    overdue:    'متأخر',
  },
};

export function paymentStatusClass(s: string | null | undefined): string {
  return PAYMENT_CLASS[(s ?? '').toLowerCase()] ?? '';
}

export function paymentStatusLabel(s: string | null | undefined, lang = 'fr'): string {
  const key = (s ?? '').toLowerCase();
  return (PAYMENT_LABEL[lang] ?? PAYMENT_LABEL['fr'])[key] ?? (s ?? '—');
}

// ─── Credit (vehicle financing) ───────────────────────────────────────────────

const CREDIT_CLASS: Record<string, string> = {
  draft:            'chip-draft',
  pending_approval: 'chip-pending',
  active:           'chip-active',
  en_cours:         'chip-active',
  completed:        'chip-done',
  termine:          'chip-done',
  defaulted:        'chip-danger',
  en_retard:        'chip-danger',
  cancelled:        'chip-cancelled',
  annule:           'chip-cancelled',
};

const CREDIT_LABEL: Record<string, Record<string, string>> = {
  fr: {
    draft:            'Brouillon',
    pending_approval: "En attente d'approbation",
    active:           'Actif',
    en_cours:         'En cours',
    completed:        'Terminé',
    termine:          'Terminé',
    defaulted:        'Défaillant',
    en_retard:        'En retard',
    cancelled:        'Annulé',
    annule:           'Annulé',
  },
  en: {
    draft:            'Draft',
    pending_approval: 'Pending Approval',
    active:           'Active',
    en_cours:         'In Progress',
    completed:        'Completed',
    termine:          'Completed',
    defaulted:        'Defaulted',
    en_retard:        'Overdue',
    cancelled:        'Cancelled',
    annule:           'Cancelled',
  },
  ar: {
    draft:            'مسودة',
    pending_approval: 'في انتظار الموافقة',
    active:           'نشط',
    en_cours:         'جارٍ',
    completed:        'مكتمل',
    termine:          'مكتمل',
    defaulted:        'متعثر',
    en_retard:        'متأخر',
    cancelled:        'ملغى',
    annule:           'ملغى',
  },
};

export function creditStatusClass(s: string | null | undefined): string {
  return CREDIT_CLASS[(s ?? '').toLowerCase()] ?? '';
}

export function creditStatusLabel(s: string | null | undefined, lang = 'fr'): string {
  const key = (s ?? '').toLowerCase();
  return (CREDIT_LABEL[lang] ?? CREDIT_LABEL['fr'])[key] ?? (s ?? '—');
}

// ─── Repair ───────────────────────────────────────────────────────────────────

const REPAIR_LABEL: Record<string, Record<string, string>> = {
  fr: { en_cours: 'En cours', termine: 'Terminée', annule: 'Annulée' },
  en: { en_cours: 'In Progress', termine: 'Completed', annule: 'Cancelled' },
  ar: { en_cours: 'جارٍ', termine: 'مكتملة', annule: 'ملغاة' },
};

export function repairStatusLabel(s: string | null | undefined, lang = 'fr'): string {
  const key = (s ?? '').toLowerCase();
  return (REPAIR_LABEL[lang] ?? REPAIR_LABEL['fr'])[key] ?? (s ?? '—');
}

// ─── Infraction ───────────────────────────────────────────────────────────────

const INFRACTION_LABEL: Record<string, Record<string, string>> = {
  fr: { en_attente: 'En attente', paye: 'Payée', annule: 'Annulée' },
  en: { en_attente: 'Pending',    paye: 'Paid',   annule: 'Cancelled' },
  ar: { en_attente: 'في الانتظار', paye: 'مدفوعة', annule: 'ملغاة' },
};

export function infractionStatusLabel(s: string | null | undefined, lang = 'fr'): string {
  const key = (s ?? '').toLowerCase();
  return (INFRACTION_LABEL[lang] ?? INFRACTION_LABEL['fr'])[key] ?? (s ?? '—');
}

// ─── Bureau ───────────────────────────────────────────────────────────────────

const BUREAU_LABEL: Record<string, Record<string, string>> = {
  fr: { actif: 'Actif', inactif: 'Inactif' },
  en: { actif: 'Active', inactif: 'Inactive' },
  ar: { actif: 'نشط', inactif: 'غير نشط' },
};

export function bureauStatusLabel(s: string | null | undefined, lang = 'fr'): string {
  const key = (s ?? '').toLowerCase();
  return (BUREAU_LABEL[lang] ?? BUREAU_LABEL['fr'])[key] ?? (s ?? '—');
}

// ─── User ─────────────────────────────────────────────────────────────────────

const USER_LABEL: Record<string, Record<string, string>> = {
  fr: { active: 'Actif', inactive: 'Désactivé', true: 'Actif', false: 'Désactivé' },
  en: { active: 'Active', inactive: 'Disabled', true: 'Active', false: 'Disabled' },
  ar: { active: 'نشط', inactive: 'معطل', true: 'نشط', false: 'معطل' },
};

export function userStatusLabel(s: string | boolean | null | undefined, lang = 'fr'): string {
  const key = String(s ?? '').toLowerCase();
  return (USER_LABEL[lang] ?? USER_LABEL['fr'])[key] ?? String(s ?? '—');
}

// ─── Email log ────────────────────────────────────────────────────────────────

const EMAIL_LABEL: Record<string, Record<string, string>> = {
  fr: { sent: 'Envoyé', failed: 'Échoué' },
  en: { sent: 'Sent',   failed: 'Failed' },
  ar: { sent: 'مُرسَل', failed: 'فشل' },
};

export function emailStatusLabel(s: string | null | undefined, lang = 'fr'): string {
  const key = (s ?? '').toLowerCase();
  return (EMAIL_LABEL[lang] ?? EMAIL_LABEL['fr'])[key] ?? (s ?? '—');
}

// ─── Compliance urgency ───────────────────────────────────────────────────────

const COMPLIANCE_LABEL: Record<string, Record<string, string>> = {
  fr: {
    overdue:  'Expiré',
    expired:  'Expiré',
    critical: 'Critique (≤7j)',
    warning:  'Avertissement (≤30j)',
    upcoming: 'Prochain (≤90j)',
    valid:    'Valide',
    ok:       'OK',
  },
  en: {
    overdue:  'Overdue',
    expired:  'Expired',
    critical: 'Critical (≤7d)',
    warning:  'Warning (≤30d)',
    upcoming: 'Upcoming (≤90d)',
    valid:    'Valid',
    ok:       'OK',
  },
  ar: {
    overdue:  'منتهي الصلاحية',
    expired:  'منتهي الصلاحية',
    critical: 'حرج (≤7أيام)',
    warning:  'تحذير (≤30يوم)',
    upcoming: 'قادم (≤90يوم)',
    valid:    'صالح',
    ok:       'OK',
  },
};

export function complianceUrgencyLabel(s: string | null | undefined, lang = 'fr'): string {
  const key = (s ?? '').toLowerCase();
  return (COMPLIANCE_LABEL[lang] ?? COMPLIANCE_LABEL['fr'])[key] ?? (s ?? '—');
}

// ─── Generic dispatcher (used by StatusPipe) ─────────────────────────────────

export function getStatusLabel(domain: string, s: string | null | undefined, lang = 'fr'): string {
  switch (domain) {
    case 'vehicle':    return vehicleStatusLabel(s, lang);
    case 'reservation':return reservationStatusLabel(s, lang);
    case 'payment':    return paymentStatusLabel(s, lang);
    case 'credit':     return creditStatusLabel(s, lang);
    case 'repair':     return repairStatusLabel(s, lang);
    case 'infraction': return infractionStatusLabel(s, lang);
    case 'bureau':     return bureauStatusLabel(s, lang);
    case 'user':       return userStatusLabel(s, lang);
    case 'email':      return emailStatusLabel(s, lang);
    case 'compliance': return complianceUrgencyLabel(s, lang);
    default:           return s ?? '—';
  }
}

export function getStatusClass(domain: string, s: string | null | undefined): string {
  switch (domain) {
    case 'vehicle':    return vehicleStatusClass(s);
    case 'reservation':return reservationStatusClass(s);
    case 'payment':    return paymentStatusClass(s);
    case 'credit':     return creditStatusClass(s);
    default:           return '';
  }
}
