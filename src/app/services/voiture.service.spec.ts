import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { VoitureService } from './voiture.service';

describe('VoitureService', () => {
  let service: VoitureService;

  beforeEach(() => {
    // Needs HttpClient (directly) and CompanyService -> HttpClient (transitively).
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VoitureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
