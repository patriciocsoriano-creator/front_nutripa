import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminVerUsuariosPage } from './admin-ver-usuarios.page';

describe('AdminVerUsuariosPage', () => {
  let component: AdminVerUsuariosPage;
  let fixture: ComponentFixture<AdminVerUsuariosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminVerUsuariosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
