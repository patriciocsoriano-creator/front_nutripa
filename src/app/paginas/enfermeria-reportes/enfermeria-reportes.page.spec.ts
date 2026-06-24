import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnfermeriaReportesPage } from './enfermeria-reportes.page';

describe('EnfermeriaReportesPage', () => {
  let component: EnfermeriaReportesPage;
  let fixture: ComponentFixture<EnfermeriaReportesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EnfermeriaReportesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
