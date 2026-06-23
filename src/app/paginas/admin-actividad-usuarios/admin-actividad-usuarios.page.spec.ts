import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminActividadUsuariosPage } from './admin-actividad-usuarios.page';

describe('AdminActividadUsuariosPage', () => {
  let component: AdminActividadUsuariosPage;
  let fixture: ComponentFixture<AdminActividadUsuariosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminActividadUsuariosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
