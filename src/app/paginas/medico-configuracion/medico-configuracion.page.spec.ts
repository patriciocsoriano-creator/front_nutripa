import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicoConfiguracionPage } from './medico-configuracion.page';

describe('MedicoConfiguracionPage', () => {
  let component: MedicoConfiguracionPage;
  let fixture: ComponentFixture<MedicoConfiguracionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicoConfiguracionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
