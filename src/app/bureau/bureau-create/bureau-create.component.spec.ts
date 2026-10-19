import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BureauCreateComponent } from './bureau-create.component';

describe('BureauCreateComponent', () => {
  let component: BureauCreateComponent;
  let fixture: ComponentFixture<BureauCreateComponent>;

  beforeEach(async () => {
    // BureauService and the component's own injected HttpClient both need it; the
    // component also injects Router.
    await TestBed.configureTestingModule({
      imports: [BureauCreateComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(BureauCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
