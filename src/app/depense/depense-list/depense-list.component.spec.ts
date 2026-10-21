import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { DepenseListComponent } from './depense-list.component';
import { CrudService } from '../../services/crud.service';

/**
 * Phase 0, Task 2 regression coverage.
 *
 * The standalone Depenses page's own "+ Add" form used to bind its category
 * field to a form control named `categorie`, which does not exist anywhere in
 * the Depense entity or its API response (only `typeDepense` does -- it's what
 * the backend actually reads on create/update and returns on list/show, and
 * what distinguishes a manually entered "Téléphone" expense from an
 * auto-generated "réparation" one). That mismatch meant:
 *   - the table's category column always rendered "-" for every row, and
 *   - submitting the add form sent `categorie` instead of `typeDepense`,
 *     which the backend's non-nullable `typeDepense` column has no fallback
 *     for -- `Depense::setTypeDepense()` requires a string, not null/undefined.
 * These tests pin the fix: the form control is now named `typeDepense`, so it
 * round-trips correctly through create, edit, and display, without touching
 * vehicle-expense-list / bureau-expense-list, which already used the correct
 * field name throughout and needed no change.
 */
describe('DepenseListComponent', () => {
  let component: DepenseListComponent;
  let fixture: ComponentFixture<DepenseListComponent>;
  let crud: CrudService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepenseListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DepenseListComponent);
    component = fixture.componentInstance;
    crud = TestBed.inject(CrudService);
    spyOn(crud, 'getPage').and.returnValue(of({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } }));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sends the typed category as typeDepense (not categorie) when creating a manual expense', () => {
    const createSpy = spyOn(crud, 'create').and.returnValue(of({ id: 1 }));

    component.openAdd();
    component.form.patchValue({ montant: 150, description: 'Fournitures bureau', typeDepense: 'fournitures' });
    component.save();

    expect(createSpy).toHaveBeenCalledWith('depense', jasmine.objectContaining({ typeDepense: 'fournitures' }));
    const sentPayload = createSpy.calls.mostRecent().args[1];
    expect(sentPayload.categorie).toBeUndefined();
  });

  it('pre-fills the category field from the record\'s typeDepense when editing', () => {
    component.openEdit({ id: 7, montant: 80, description: 'Café client', date: '2026-01-01', typeDepense: 'fournitures' });

    expect(component.form.get('typeDepense')?.value).toBe('fournitures');
  });

  it('displays the real category instead of a permanently blank dash', () => {
    component.items = [{ id: 9, montant: 60, description: 'Eau', date: '2026-01-02', typeDepense: 'eau' }];
    fixture.detectChanges();

    const cellText = (fixture.nativeElement as HTMLElement).querySelector('tbody tr td:nth-child(4)')?.textContent?.trim();
    expect(cellText).toBe('eau');
  });
});
