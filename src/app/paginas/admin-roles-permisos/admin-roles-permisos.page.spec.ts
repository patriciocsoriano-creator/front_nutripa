import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminRolesPermisosPage } from './admin-roles-permisos.page';

describe('AdminRolesPermisosPage', () => {
  let component: AdminRolesPermisosPage;
  let fixture: ComponentFixture<AdminRolesPermisosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminRolesPermisosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
