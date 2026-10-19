import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ClientDebtListComponent } from './client-debt-list.component';

/**
 * AGOCAR 2.0 production QA remediation: the component previously read
 * `c.clientId` / `c.totalOwed` from each debtor row, but the real backend
 * (ClientController::serializeClient()) has only ever sent `id` /
 * `outstandingDebt` -- confirmed against tests/Api/ClientDebtorsEndpointTest.php,
 * which asserts the `outstandingDebt` key directly. The mismatch meant every
 * row silently rendered a blank amount, a wrong ("low") risk label, and a
 * broken expand/profile-navigation target (both driven by the undefined id).
 * This regression test pins the component to the field names the backend
 * actually sends.
 */
describe('ClientDebtListComponent — API field mapping', () => {
  let fixture: ComponentFixture<ClientDebtListComponent>;
  let component: ClientDebtListComponent;
  let httpMock: HttpTestingController;

  const apiRow = {
    id: 42,
    nom: 'Benali',
    prenom: 'Rachid',
    telephone: '+212661111001',
    cin: 'AB123456',
    outstandingDebt: 1500,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientDebtListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientDebtListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const req = httpMock.expectOne(r => r.url.includes('client/debtors'));
    req.flush({ data: [apiRow], meta: { total: 1, grandTotal: 1500, highRiskCount: 0 } });
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('reads the real outstandingDebt field, not the old totalOwed name', () => {
    expect(component.debtors[0].outstandingDebt).toBe(1500);
    const rendered = (fixture.nativeElement as HTMLElement).querySelector('.debt-amount')?.textContent ?? '';
    expect(rendered).toContain('1,500');
  });

  it('reads the real id field, not the old clientId name, so expand/profile targeting works', () => {
    expect(component.debtors[0].id).toBe(42);
    component.toggleExpand(component.debtors[0]);
    expect(component.expandedId).toBe(42);
    const reqs = httpMock.match(r => r.url.includes('reservation') && r.params.get('clientId') === '42');
    expect(reqs.length).toBe(1);
    reqs[0].flush([]);
  });

  it('risk level is computed from the real debt amount, not undefined', () => {
    // 1500 is below the 5000 "high" threshold used by the backend's own
    // highRiskCount logic -- confirms the component isn't just defaulting
    // every row to "low" because the field was undefined.
    expect(component.debtRiskLevel(component.debtors[0].outstandingDebt)).toBeDefined();
    expect(component.debtRiskLevel(component.debtors[0].outstandingDebt)).not.toBe('high');
  });
});
