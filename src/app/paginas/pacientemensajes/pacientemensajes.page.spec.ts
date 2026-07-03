import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PacienteMensajesPage } from './pacientemensajes.page';

describe('PacientemensajesPage', () => {
  let component: PacienteMensajesPage;
  let fixture: ComponentFixture<PacienteMensajesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PacienteMensajesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
