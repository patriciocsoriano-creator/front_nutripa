import { TestBed } from '@angular/core/testing';

import { General } from './general';

describe('General', () => {
  let service: General;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(General);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
