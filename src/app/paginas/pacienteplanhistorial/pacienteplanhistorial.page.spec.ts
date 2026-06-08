import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PacienteplanhistorialPage } from './pacienteplanhistorial.page';

describe('PacienteplanhistorialPage', () => {
  let component: PacienteplanhistorialPage;
  let fixture: ComponentFixture<PacienteplanhistorialPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PacienteplanhistorialPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
