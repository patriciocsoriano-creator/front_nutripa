import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicoinformesPage } from './medicoinformes.page';

describe('MedicoinformesPage', () => {
  let component: MedicoinformesPage;
  let fixture: ComponentFixture<MedicoinformesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicoinformesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
