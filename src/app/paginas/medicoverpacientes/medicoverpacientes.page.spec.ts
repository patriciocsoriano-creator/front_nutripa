import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicoverpacientesPage } from './medicoverpacientes.page';

describe('MedicoverpacientesPage', () => {
  let component: MedicoverpacientesPage;
  let fixture: ComponentFixture<MedicoverpacientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicoverpacientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
