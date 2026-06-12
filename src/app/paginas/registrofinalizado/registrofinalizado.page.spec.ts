import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistrofinalizadoPage } from './registrofinalizado.page';

describe('RegistrofinalizadoPage', () => {
  let component: RegistrofinalizadoPage;
  let fixture: ComponentFixture<RegistrofinalizadoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistrofinalizadoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
