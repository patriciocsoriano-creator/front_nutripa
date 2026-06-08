import { TestBed } from '@angular/core/testing';

import { Ubicaciones } from './ubicaciones';

describe('Ubicaciones', () => {
  let service: Ubicaciones;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Ubicaciones);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
