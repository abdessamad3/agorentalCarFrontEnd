import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { BureauService } from './bureauservice.service';

describe('BureauService', () => {
  let service: BureauService;

  beforeEach(() => {
    // The service injects HttpClient -- without provideHttpClient() this fails at
    // injection time with NullInjectorError, even though the class itself compiles.
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(BureauService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
