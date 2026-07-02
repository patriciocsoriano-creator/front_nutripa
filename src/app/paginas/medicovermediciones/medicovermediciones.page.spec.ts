import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicovermedicionesPage } from './medicovermediciones.page';

describe('MedicovermedicionesPage', () => {
  let component: MedicovermedicionesPage;
  let fixture: ComponentFixture<MedicovermedicionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicovermedicionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
