import { TestBed } from '@angular/core/testing';

import { FatsecretApi } from './fatsecret-api';

describe('FatsecretApi', () => {
  let service: FatsecretApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FatsecretApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
