import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicoBuscarPacientePage } from './medico-buscar-paciente.page';

describe('MedicoBuscarPacientePage', () => {
  let component: MedicoBuscarPacientePage;
  let fixture: ComponentFixture<MedicoBuscarPacientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicoBuscarPacientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
