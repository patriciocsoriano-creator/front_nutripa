import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminReportesGlobalesPage } from './admin-reportes-globales.page';

describe('AdminReportesGlobalesPage', () => {
  let component: AdminReportesGlobalesPage;
  let fixture: ComponentFixture<AdminReportesGlobalesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminReportesGlobalesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
