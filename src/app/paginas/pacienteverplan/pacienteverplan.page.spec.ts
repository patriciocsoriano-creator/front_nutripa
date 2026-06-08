import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PacienteverplanPage } from './pacienteverplan.page';

describe('PacienteverplanPage', () => {
  let component: PacienteverplanPage;
  let fixture: ComponentFixture<PacienteverplanPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PacienteverplanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
