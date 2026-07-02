import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PacienteconfiguracionPage } from './pacienteconfiguracion.page';

describe('PacienteconfiguracionPage', () => {
  let component: PacienteconfiguracionPage;
  let fixture: ComponentFixture<PacienteconfiguracionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PacienteconfiguracionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
