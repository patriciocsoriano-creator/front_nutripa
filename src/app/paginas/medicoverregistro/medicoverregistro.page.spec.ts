import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicoverregistroPage } from './medicoverregistro.page';

describe('MedicoverregistroPage', () => {
  let component: MedicoverregistroPage;
  let fixture: ComponentFixture<MedicoverregistroPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicoverregistroPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
