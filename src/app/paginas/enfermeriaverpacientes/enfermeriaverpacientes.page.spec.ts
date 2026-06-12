import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnfermeriaverpacientesPage } from './enfermeriaverpacientes.page';

describe('EnfermeriaverpacientesPage', () => {
  let component: EnfermeriaverpacientesPage;
  let fixture: ComponentFixture<EnfermeriaverpacientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EnfermeriaverpacientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
