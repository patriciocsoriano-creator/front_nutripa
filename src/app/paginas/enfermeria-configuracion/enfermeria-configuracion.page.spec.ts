import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnfermeriaConfiguracionPage } from './enfermeria-configuracion.page';

describe('EnfermeriaConfiguracionPage', () => {
  let component: EnfermeriaConfiguracionPage;
  let fixture: ComponentFixture<EnfermeriaConfiguracionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EnfermeriaConfiguracionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
