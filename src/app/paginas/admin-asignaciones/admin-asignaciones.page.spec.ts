import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAsignacionesPage } from './admin-asignaciones.page';

describe('AdminAsignacionesPage', () => {
  let component: AdminAsignacionesPage;
  let fixture: ComponentFixture<AdminAsignacionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAsignacionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
