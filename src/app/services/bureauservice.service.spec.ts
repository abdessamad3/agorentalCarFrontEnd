import { TestBed } from '@angular/core/testing';

import { BureauserviceService } from './bureauservice.service';

describe('BureauserviceService', () => {
  let service: BureauserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BureauserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
