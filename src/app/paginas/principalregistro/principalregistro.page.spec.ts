import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrincipalregistroPage } from './principalregistro.page';

describe('PrincipalregistroPage', () => {
  let component: PrincipalregistroPage;
  let fixture: ComponentFixture<PrincipalregistroPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PrincipalregistroPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
