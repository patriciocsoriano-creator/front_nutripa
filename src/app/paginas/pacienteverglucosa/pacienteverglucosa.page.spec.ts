import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PacienteverglucosaPage } from './pacienteverglucosa.page';

describe('PacienteverglucosaPage', () => {
  let component: PacienteverglucosaPage;
  let fixture: ComponentFixture<PacienteverglucosaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PacienteverglucosaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
