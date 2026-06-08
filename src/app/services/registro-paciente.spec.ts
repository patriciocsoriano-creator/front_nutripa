import { TestBed } from '@angular/core/testing';

import { RegistroPaciente } from './registro-paciente';

describe('RegistroPaciente', () => {
  let service: RegistroPaciente;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegistroPaciente);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
