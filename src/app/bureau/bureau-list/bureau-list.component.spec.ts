import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BureauListComponent } from './bureau-list.component';

describe('BureauListComponent', () => {
  let component: BureauListComponent;
  let fixture: ComponentFixture<BureauListComponent>;

  beforeEach(async () => {
    // BureauService/CrudService/TranslationService/AuthService all need HttpClient.
    // The template's <app-btn> has no injected dependencies of its own, so rendering
    // it is safe. ngOnInit()'s two crud.getAll() calls stay pending under
    // provideHttpClientTesting() -- no real network call.
    await TestBed.configureTestingModule({
      imports: [BureauListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(BureauListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
