import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistroinfopacientePage } from './registroinfopaciente.page';

describe('RegistroinfopacientePage', () => {
  let component: RegistroinfopacientePage;
  let fixture: ComponentFixture<RegistroinfopacientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistroinfopacientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
