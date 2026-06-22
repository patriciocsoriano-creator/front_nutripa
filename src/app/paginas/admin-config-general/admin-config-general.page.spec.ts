import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminConfigGeneralPage } from './admin-config-general.page';

describe('AdminConfigGeneralPage', () => {
  let component: AdminConfigGeneralPage;
  let fixture: ComponentFixture<AdminConfigGeneralPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminConfigGeneralPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
