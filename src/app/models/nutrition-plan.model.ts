// src/app/models/nutrition-plan.model.ts

export type MealType = 'desayuno' | 'media_manana' | 'almuerzo' | 'media_tarde' | 'cena' | 'colacion';
export type DietaryStyle = 'occidental' | 'mediterranea' | 'baja_carbo' | 'vegetariana';
export type EconomicLevel = 'baja' | 'media' | 'alta';
export type ActivityLevel = 'sedentario' | 'ligera' | 'moderada' | 'intensa';

export interface FoodItem {
  food_id: string;
  name: string;
  brand?: string;
  serving_size: number;
  serving_unit: string;  // Debe ser: 'g', 'ml', 'unidad', 'rebanada', 'taza', etc.
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  image_url?: string;
  fatsecret_id?: string;
}

export interface MealPlan {
  meal_type: MealType;
  time_suggestion?: string;
  foods: FoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  notes?: string;
}

export interface DayPlan {
  date: string;
  day_name: string;
  meals: MealPlan[];
  daily_totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  hydration_goal_liters: number;
  special_notes?: string;
}

export interface WeekPlan {
  week_number: number;
  start_date: string;
  end_date: string;
  days: DayPlan[];
  weekly_goals: {
    avg_daily_calories: number;
    target_macros: { protein: number; carbs: number; fat: number };
    focus_areas: string[];
  };
}

export interface NutritionPlanPreferences {
  dietary_style: DietaryStyle;
  economic_level: EconomicLevel;
  activity_level: ActivityLevel;
}

export interface NutritionPlanRecommendations {
  main: string;
  additional_notes: string;
}

export interface PlanGenerationInput {
  patient_id: string;
  patient_name: string;
  profile_type: 'Hipocalorico' | 'Control Glucemico' | 'Hipo-grasa' | 'Normocalorico';
  profile_id: number;
  daily_calories: number;
  macros: { protein: number; carbs: number; fat: number };
  allergies: string[];
  preferences: NutritionPlanPreferences;
  recommendations: NutritionPlanRecommendations;
  registro_id?: string;
}

export interface DietTotals {
  total_cho: number;
  total_protein: number;
  total_fat: number;
  total_calories: number;
  total_fiber?: number;
}

export interface GeneratedNutritionPlan {
  patient_id: string;
  patient_name: string;
  profile_type: 'Hipocalorico' | 'Control Glucemico' | 'Hipo-grasa' | 'Normocalorico';
  profile_id: number;
  daily_calorie_target: number;
  diet_totals?: DietTotals;
  macro_distribution: { protein: number; carbs: number; fat: number };
  restrictions: {
    allergies: string[];
    intolerances: string[];
    avoid_foods: string[];
  };
  preferences: NutritionPlanPreferences;
  recommendations: NutritionPlanRecommendations;
  plan: {
    weekly: WeekPlan;
    monthly_summary: {
      total_days: number;
      avg_calories: number;
      adherence_tips: string[];
      progress_checkpoints: { week: number; goal: string }[];
    };
  };
  generated_at: string;
  valid_until: string;
  metadata: {
    ai_confidence: number;
    clinical_validation_required: boolean;
    source: 'fatsecret_api' | 'local_database' | 'hybrid';
    glycemic_control_applied?: boolean;
  };
}

export interface PlanSaveResponse {
  error: boolean;
  mensaje: string;
  plan_id?: string;
}

