import { TestBed } from '@angular/core/testing';

import { NutritionPlan } from './nutrition-plan';

describe('NutritionPlan', () => {
  let service: NutritionPlan;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NutritionPlan);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
