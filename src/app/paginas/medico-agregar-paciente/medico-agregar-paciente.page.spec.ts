import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicoAgregarPacientePage } from './medico-agregar-paciente.page';

describe('MedicoAgregarPacientePage', () => {
  let component: MedicoAgregarPacientePage;
  let fixture: ComponentFixture<MedicoAgregarPacientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicoAgregarPacientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
