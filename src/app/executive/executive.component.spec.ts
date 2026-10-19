import { ExecutiveComponent } from './executive.component';

/**
 * Phase 12.9 Stage B1-G: the executive dashboard's "outstanding" KPI must reuse the
 * backend's already-correct, refund-aware Reservation.montantRestant field (as every
 * row from GET /api/reservation already includes) instead of recomputing
 * total - montantPaye locally, which doesn't know about refunds (the same category of
 * bug fixed on the backend's client-debt aggregation in Stage B1-F).
 *
 * These tests call the component's private recomputeFiltered()/applyDateFilter()
 * directly with synthetic reservation rows, bypassing ngOnInit()'s real HTTP calls --
 * CrudService/AuthService/TranslationService are given minimal stand-in objects
 * (no TestBed, no HttpClientTestingModule needed) so this stays a pure, isolated
 * calculation test, not a backend integration test. Bureau-based visibility is NOT
 * re-tested here: it is enforced entirely server-side (BureauAwareTrait, same as every
 * other list endpoint) before this component ever sees the data, so there is nothing
 * bureau-specific in this component's own logic to assert against.
 */
describe('ExecutiveComponent outstanding/collected calculation', () => {
  function makeComponent(): ExecutiveComponent {
    const stubTs: any = { translate: (k: string) => k, getCurrentLanguage: () => 'fr' };
    const stubAuth: any = { hasRole: () => false };
    const stubCrud: any = {};
    const stubCdr: any = {};
    return new ExecutiveComponent(stubCrud, stubTs, stubAuth, stubCdr);
  }

  function reservation(overrides: Partial<Record<string, any>>): any {
    return {
      reservationStatus: 'confirmee',
      total: '0', montantPaye: '0', montantRestant: 0,
      dateDebut: '2026-06-15',
      ...overrides,
    };
  }

  function recompute(component: ExecutiveComponent, resList: any[]): void {
    (component as any).recomputeFiltered(resList, [], false);
  }

  it('unpaid reservation: full total is outstanding', () => {
    const c = makeComponent();
    recompute(c, [reservation({ total: '1000', montantPaye: '0', montantRestant: 1000 })]);
    expect(c.outstanding).toBe(1000);
    expect(c.collected).toBe(0);
  });

  it('partially paid reservation: only the remainder is outstanding', () => {
    const c = makeComponent();
    recompute(c, [reservation({ total: '1000', montantPaye: '400', montantRestant: 600 })]);
    expect(c.outstanding).toBe(600);
    expect(c.collected).toBe(400);
  });

  it('fully settled reservation: zero outstanding', () => {
    const c = makeComponent();
    recompute(c, [reservation({ total: '1000', montantPaye: '1000', montantRestant: 0 })]);
    expect(c.outstanding).toBe(0);
    expect(c.collected).toBe(1000);
  });

  it('refunded reservation (fully paid then partially refunded): zero outstanding, not a phantom debt', () => {
    const c = makeComponent();
    // montantPaye is already net of the refund (800 = 1000 - 200); the backend's
    // montantRestant correctly reflects this as settled (0), not max(0, 1000-800)=200.
    recompute(c, [reservation({ total: '1000', montantPaye: '800', montantRestant: 0 })]);
    expect(c.outstanding).toBe(0);
    expect(c.collected).toBe(800);
  });

  it('mixed reservation histories across multiple clients/statuses sum correctly', () => {
    const c = makeComponent();
    recompute(c, [
      reservation({ clientId: 1, total: '1000', montantPaye: '400', montantRestant: 600 }), // owes 600
      reservation({ clientId: 2, total: '500', montantPaye: '500', montantRestant: 0 }),     // settled
      reservation({ clientId: 1, total: '300', montantPaye: '0', montantRestant: 300, reservationStatus: 'pending' }), // owes 300 (pending still counts, matches backend)
      reservation({ clientId: 3, total: '800', montantPaye: '0', montantRestant: 800, reservationStatus: 'annulee' }), // cancelled: excluded
    ]);
    expect(c.outstanding).toBe(900); // 600 + 300, cancelled excluded
    expect(c.collected).toBe(900);   // 400 + 500 + 0 (cancelled's montantPaye excluded too, since activeRes filters it out)
  });

  it('cancelled reservations never count toward outstanding or collected, regardless of montantRestant', () => {
    const c = makeComponent();
    recompute(c, [
      reservation({ total: '1000', montantPaye: '0', montantRestant: 1000, reservationStatus: 'annulee' }),
      reservation({ total: '1000', montantPaye: '0', montantRestant: 1000, reservationStatus: 'cancelled' }),
      reservation({ total: '1000', montantPaye: '0', montantRestant: 1000, reservationStatus: 'annule' }),
    ]);
    expect(c.outstanding).toBe(0);
    expect(c.collected).toBe(0);
  });

  it('date filter scopes outstanding to reservations starting in range (an intentionally period-scoped metric)', () => {
    const c = makeComponent();
    (c as any).rawResList = [
      reservation({ total: '1000', montantPaye: '0', montantRestant: 1000, dateDebut: '2026-01-10' }),
      reservation({ total: '2000', montantPaye: '0', montantRestant: 2000, dateDebut: '2026-06-10' }),
    ];
    (c as any).rawExpList = [];

    c.filterFrom = '2026-06-01';
    c.filterTo   = '2026-06-30';
    c.applyDateFilter();
    expect(c.outstanding).toBe(2000);

    c.filterFrom = '';
    c.filterTo   = '';
    c.applyDateFilter();
    expect(c.outstanding).toBe(3000);
  });

  it('rebuilds the outstandingDebt KPI card and alert banner from the corrected total', () => {
    const c = makeComponent();
    recompute(c, [reservation({ total: '1000', montantPaye: '0', montantRestant: 1000 })]);

    const kpi = c.kpis.find(k => k.label === 'outstandingDebt');
    expect(kpi).toBeTruthy();
    expect(kpi!.value).toContain('1'); // formatted "1,000 MAD" (locale-dependent grouping)

    const alert = c.alerts.find(a => a.link === '/paiement-client');
    expect(alert).toBeTruthy();
  });
});
