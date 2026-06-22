import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminVerMedicosPage } from './admin-ver-medicos.page';

describe('AdminVerMedicosPage', () => {
  let component: AdminVerMedicosPage;
  let fixture: ComponentFixture<AdminVerMedicosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminVerMedicosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
