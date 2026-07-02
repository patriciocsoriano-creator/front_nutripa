import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PacientehistorialmedicoPage } from './pacientehistorialmedico.page';

describe('PacientehistorialmedicoPage', () => {
  let component: PacientehistorialmedicoPage;
  let fixture: ComponentFixture<PacientehistorialmedicoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PacientehistorialmedicoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
