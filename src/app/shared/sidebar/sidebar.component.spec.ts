import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    // AuthService/TranslationService/CompanyService need HttpClient; the component
    // injects Router. ngOnInit() calls CompanyService.refreshBureaux(), a real HTTP
    // GET -- provideHttpClientTesting() keeps it from ever reaching a real backend;
    // it's simply left unresolved (pending), which is harmless for this test.
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
