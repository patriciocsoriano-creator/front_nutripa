import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminConfigParametrosPage } from './admin-config-parametros.page';

describe('AdminConfigParametrosPage', () => {
  let component: AdminConfigParametrosPage;
  let fixture: ComponentFixture<AdminConfigParametrosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminConfigParametrosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
