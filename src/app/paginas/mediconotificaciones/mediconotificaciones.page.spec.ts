import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicoNotificacionesPage } from './mediconotificaciones.page';

describe('MediconotificacionesPage', () => {
  let component: MedicoNotificacionesPage;
  let fixture: ComponentFixture<MedicoNotificacionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicoNotificacionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
