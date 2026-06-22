import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminVerPacientesPage } from './admin-ver-pacientes.page';

describe('AdminVerPacientesPage', () => {
  let component: AdminVerPacientesPage;
  let fixture: ComponentFixture<AdminVerPacientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminVerPacientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
