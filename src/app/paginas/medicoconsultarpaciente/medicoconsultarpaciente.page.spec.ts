import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicoconsultarpacientePage } from './medicoconsultarpaciente.page';

describe('MedicoconsultarpacientePage', () => {
  let component: MedicoconsultarpacientePage;
  let fixture: ComponentFixture<MedicoconsultarpacientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicoconsultarpacientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
