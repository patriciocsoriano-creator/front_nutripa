import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminConfigBackupPage } from './admin-config-backup.page';

describe('AdminConfigBackupPage', () => {
  let component: AdminConfigBackupPage;
  let fixture: ComponentFixture<AdminConfigBackupPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminConfigBackupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
