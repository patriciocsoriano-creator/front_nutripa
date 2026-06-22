import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAgregarUsuarioPage } from './admin-agregar-usuario.page';

describe('AdminAgregarUsuarioPage', () => {
  let component: AdminAgregarUsuarioPage;
  let fixture: ComponentFixture<AdminAgregarUsuarioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAgregarUsuarioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
