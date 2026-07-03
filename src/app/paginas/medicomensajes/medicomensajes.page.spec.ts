import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicomensajesPage } from './medicomensajes.page';

describe('MedicomensajesPage', () => {
  let component: MedicomensajesPage;
  let fixture: ComponentFixture<MedicomensajesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicomensajesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
