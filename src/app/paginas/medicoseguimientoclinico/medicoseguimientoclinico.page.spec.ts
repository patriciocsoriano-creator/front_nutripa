import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicoseguimientoclinicoPage } from './medicoseguimientoclinico.page';

describe('MedicoseguimientoclinicoPage', () => {
  let component: MedicoseguimientoclinicoPage;
  let fixture: ComponentFixture<MedicoseguimientoclinicoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicoseguimientoclinicoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
