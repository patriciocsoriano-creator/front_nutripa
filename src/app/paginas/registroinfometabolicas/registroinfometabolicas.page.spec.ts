import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistroinfometabolicasPage } from './registroinfometabolicas.page';

describe('RegistroinfometabolicasPage', () => {
  let component: RegistroinfometabolicasPage;
  let fixture: ComponentFixture<RegistroinfometabolicasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistroinfometabolicasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
