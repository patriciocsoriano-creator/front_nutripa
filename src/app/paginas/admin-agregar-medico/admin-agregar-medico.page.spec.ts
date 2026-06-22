import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAgregarMedicoPage } from './admin-agregar-medico.page';

describe('AdminAgregarMedicoPage', () => {
  let component: AdminAgregarMedicoPage;
  let fixture: ComponentFixture<AdminAgregarMedicoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAgregarMedicoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
