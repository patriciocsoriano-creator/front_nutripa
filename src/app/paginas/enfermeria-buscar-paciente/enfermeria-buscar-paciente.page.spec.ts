import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnfermeriaBuscarPacientePage } from './enfermeria-buscar-paciente.page';

describe('EnfermeriaBuscarPacientePage', () => {
  let component: EnfermeriaBuscarPacientePage;
  let fixture: ComponentFixture<EnfermeriaBuscarPacientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EnfermeriaBuscarPacientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
