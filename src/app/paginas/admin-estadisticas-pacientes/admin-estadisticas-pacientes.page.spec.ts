import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminEstadisticasPacientesPage } from './admin-estadisticas-pacientes.page';

describe('AdminEstadisticasPacientesPage', () => {
  let component: AdminEstadisticasPacientesPage;
  let fixture: ComponentFixture<AdminEstadisticasPacientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminEstadisticasPacientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
