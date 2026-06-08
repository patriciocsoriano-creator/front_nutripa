import { TestBed } from '@angular/core/testing';

import { PatientDataUtil } from './patient-data-util';

describe('PatientDataUtil', () => {
  let service: PatientDataUtil;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PatientDataUtil);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
