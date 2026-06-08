import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnfermeriaPage } from './enfermeria.page';

describe('EnfermeriaPage', () => {
  let component: EnfermeriaPage;
  let fixture: ComponentFixture<EnfermeriaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EnfermeriaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
