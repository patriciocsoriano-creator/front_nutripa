import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { 
  FoodItem, 
  GeneratedNutritionPlan, 
  MealPlan, 
  DayPlan, 
  WeekPlan, 
  MealType,
  PlanGenerationInput,
  PlanSaveResponse,
  NutritionPlanPreferences,
  NutritionPlanRecommendations,
  ActivityLevel,
  DietaryStyle
} from '../models/nutrition-plan.model';
import { FatsecretApiService } from 'src/app/services/fatsecret-api';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class NutritionPlanService {

  private readonly API_URL = `${environment.apiUrl}/nutricionapp-api/medico/plan-nutricional`;

  private readonly MAX_PORTION_GRAMS = 300;
  private readonly MIN_PORTION_GRAMS = 10;
  private readonly MAX_CALORIES_PER_FOOD = 500;

  private readonly ALIMENTOS_NO_APROPIADOS = [
    'especia', 'fenogreco', 'galleta', 'cookie', 'spice', 'seasoning',
    'candy', 'dulce', 'soda', 'refresco', 'alcohol', 'beer', 'wine',
    'aceite', 'manteca', 'grasa', 'sugar', 'azúcar', 'salt', 'sal',
    'extract', 'extracto', 'flavoring', 'saborizante', 'coloring',
    'supplement', 'suplemento', 'powder', 'polvo', 'concentrate'
  ];

  private readonly LIMITES_UNIDADES: Record<string, number> = {
    'huevo': 3,
    'egg': 3,
    'unidad': 3,
    'rebanada': 4,
    'slice': 4
  };

  private readonly PORCIONES_TIPICAS: Record<string, { size: number; unit: string }> = {
    'huevo': { size: 50, unit: 'unidad' },
    'egg': { size: 50, unit: 'unidad' },
    'leche': { size: 240, unit: 'ml' },
    'milk': { size: 240, unit: 'ml' },
    'yogur': { size: 150, unit: 'g' },
    'yogurt': { size: 150, unit: 'g' },
    'queso': { size: 30, unit: 'g' },
    'cheese': { size: 30, unit: 'g' },
    'cottage': { size: 100, unit: 'g' },
    'arroz': { size: 150, unit: 'g' },
    'rice': { size: 150, unit: 'g' },
    'pasta': { size: 150, unit: 'g' },
    'pollo': { size: 120, unit: 'g' },
    'chicken': { size: 120, unit: 'g' },
    'pescado': { size: 120, unit: 'g' },
    'fish': { size: 120, unit: 'g' },
    'salmon': { size: 120, unit: 'g' },
    'salmón': { size: 120, unit: 'g' },
    'carne': { size: 120, unit: 'g' },
    'beef': { size: 120, unit: 'g' },
    'res': { size: 120, unit: 'g' },
    'cerdo': { size: 120, unit: 'g' },
    'pork': { size: 120, unit: 'g' },
    'tofu': { size: 100, unit: 'g' },
    'fruta': { size: 150, unit: 'g' },
    'fruit': { size: 150, unit: 'g' },
    'manzana': { size: 150, unit: 'g' },
    'apple': { size: 150, unit: 'g' },
    'banana': { size: 120, unit: 'g' },
    'plátano': { size: 120, unit: 'g' },
    'pera': { size: 150, unit: 'g' },
    'pear': { size: 150, unit: 'g' },
    'naranja': { size: 150, unit: 'g' },
    'orange': { size: 150, unit: 'g' },
    'verdura': { size: 100, unit: 'g' },
    'vegetable': { size: 100, unit: 'g' },
    'brócoli': { size: 100, unit: 'g' },
    'broccoli': { size: 100, unit: 'g' },
    'espinaca': { size: 100, unit: 'g' },
    'spinach': { size: 100, unit: 'g' },
    'zanahoria': { size: 100, unit: 'g' },
    'carrot': { size: 100, unit: 'g' },
    'pepino': { size: 100, unit: 'g' },
    'cucumber': { size: 100, unit: 'g' },
    'nueces': { size: 30, unit: 'g' },
    'nuts': { size: 30, unit: 'g' },
    'almendras': { size: 30, unit: 'g' },
    'almonds': { size: 30, unit: 'g' },
    'avena': { size: 40, unit: 'g' },
    'oatmeal': { size: 40, unit: 'g' },
    'oats': { size: 40, unit: 'g' },
    'pan': { size: 30, unit: 'g' },
    'bread': { size: 30, unit: 'g' },
    'quinoa': { size: 100, unit: 'g' },
    'lentejas': { size: 100, unit: 'g' },
    'lentils': { size: 100, unit: 'g' },
    'frijoles': { size: 100, unit: 'g' },
    'beans': { size: 100, unit: 'g' },
    'papa': { size: 150, unit: 'g' },
    'potato': { size: 150, unit: 'g' }
  };

  constructor(
    private http: HttpClient,
    private fatsecretApi: FatsecretApiService
  ) {}

  async generatePlan(input: PlanGenerationInput): Promise<GeneratedNutritionPlan> {
    const needsGlycemicControl = this._needsGlycemicControl(input);
    const profileType = needsGlycemicControl ? 'Control Glucemico' : input.profile_type;
    
    const mealDistribution = this.calculateMealDistribution(profileType, input.preferences.activity_level);
    const weekPlan = await this.generateWeekPlan(input, mealDistribution, needsGlycemicControl);
    const monthlySummary = this.generateMonthlySummary(weekPlan);
    
    return {
      patient_id: input.patient_id,
      patient_name: input.patient_name,
      profile_type: profileType,
      profile_id: needsGlycemicControl ? 1 : input.profile_id,
      daily_calorie_target: input.daily_calories,
      macro_distribution: this._getMacrosForProfile(profileType),
      restrictions: {
        allergies: input.allergies,
        intolerances: [],
        avoid_foods: this.getFoodsToAvoid(profileType, input.allergies)
      },
      preferences: input.preferences,
      recommendations: this._getRecommendations(profileType, input.recommendations),
      plan: {
        weekly: weekPlan,
        monthly_summary: monthlySummary
      },
      generated_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      metadata: {
        ai_confidence: needsGlycemicControl ? 0.98 : 0.95,
        clinical_validation_required: needsGlycemicControl,
        source: 'fatsecret_api',
        glycemic_control_applied: needsGlycemicControl
      }
    };
  }

  private _needsGlycemicControl(input: PlanGenerationInput): boolean {
    if (input.profile_type === 'Control Glucemico') return true;
    const clinical = (input as any).datos_clinicos_base;
    if (!clinical) return false;
    const glucosaAyunas = clinical.glucosa_ayunas;
    const hba1c = clinical.hba1c;
    if (glucosaAyunas && glucosaAyunas >= 126) return true;
    if (hba1c && hba1c >= 6.5) return true;
    return false;
  }

  private _getMacrosForProfile(profile: string): { protein: number; carbs: number; fat: number } {
    const macros: Record<string, { protein: number; carbs: number; fat: number }> = {
      'Normocalorico': { protein: 25, carbs: 50, fat: 25 },
      'Control Glucemico': { protein: 30, carbs: 40, fat: 30 },
      'Hipocalorico': { protein: 35, carbs: 40, fat: 25 },
      'Hipo-grasa': { protein: 25, carbs: 55, fat: 20 }
    };
    return macros[profile] || macros['Normocalorico'];
  }

  private _getRecommendations(profile: string, base: NutritionPlanRecommendations): NutritionPlanRecommendations {
    if (profile === 'Control Glucemico') {
      return {
        main: 'Control estricto de carbohidratos. Priorizar alimentos de bajo índice glucémico. Monitorear glucosa postprandial.',
        additional_notes: base.additional_notes 
          ? `${base.additional_notes}. Evitar picos glucémicos.` 
          : 'Evitar picos glucémicos.'
      };
    }
    return base;
  }

  private async generateWeekPlan(
    input: PlanGenerationInput, 
    mealDist: Record<MealType, number>,
    needsGlycemicControl: boolean
  ): Promise<WeekPlan> {
    const days: DayPlan[] = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('es-EC', { weekday: 'long' });
      
      const meals = await this.generateDayMeals(input, mealDist, dayName, i, needsGlycemicControl);
      
      const daily_totals = meals.reduce((acc: any, meal: MealPlan) => ({
        calories: this._round(acc.calories + meal.total_calories),
        protein: this._round(acc.protein + meal.total_protein),
        carbs: this._round(acc.carbs + meal.total_carbs),
        fat: this._round(acc.fat + meal.total_fat),
        fiber: this._round((acc.fiber || 0) + meal.foods.reduce((s: number, f: FoodItem) => s + (f.fiber || 0), 0))
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
      
      let specialNotes = this.getDailyNotes(needsGlycemicControl ? 'Control Glucemico' : input.profile_type, i);
      
      // Validación de fibra mínima
      if (daily_totals.fiber < 25) {
        specialNotes += ' Incrementar fibra.';
      }
      
      days.push({
        date: date.toISOString().split('T')[0],
        day_name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        meals,
        daily_totals,
        hydration_goal_liters: this.calculateHydrationGoal(input.preferences.activity_level),
        special_notes: specialNotes
      });
    }
    
    return {
      week_number: this.getWeekNumber(today),
      start_date: days[0].date,
      end_date: days[6].date,
      days,
      weekly_goals: {
        avg_daily_calories: Math.round(days.reduce((s: number, d: DayPlan) => s + d.daily_totals.calories, 0) / 7),
        target_macros: this._getMacrosForProfile(needsGlycemicControl ? 'Control Glucemico' : input.profile_type),
        focus_areas: this.getWeeklyFocusAreas(needsGlycemicControl ? 'Control Glucemico' : input.profile_type)
      }
    };
  }

  private async generateDayMeals(
    input: PlanGenerationInput, 
    mealDist: Record<MealType, number>, 
    dayName: string, 
    dayIndex: number,
    needsGlycemicControl: boolean
  ): Promise<MealPlan[]> {
    const meals: MealPlan[] = [];
    const mealOrder: MealType[] = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena', 'colacion'];
    
    for (const mealType of mealOrder) {
      if (mealDist[mealType] === 0) continue;
      
      const targetCalories = Math.round(input.daily_calories * mealDist[mealType]);
      
      let foods = await this.selectFoodsForMeal(
        input, 
        mealType, 
        targetCalories, 
        dayIndex, 
        needsGlycemicControl
      );
      
      foods = foods.filter((food: FoodItem) => 
        !input.allergies.some((allergy: string) => 
          food.name.toLowerCase().includes(allergy.toLowerCase()) ||
          food.brand?.toLowerCase().includes(allergy.toLowerCase())
        )
      );
      
      foods = foods.filter(food => this._esAlimentoApropiado(food));
      foods = this._eliminarDuplicados(foods);
      foods = this.removeDoubleCarbs(foods);
      
      if (foods.length === 0) {
        foods = this._getMinimumFoodsForMeal(mealType, needsGlycemicControl, input.allergies);
      }
      
      // SOLUCION 1: Validar proteína en almuerzo/cena
      if (mealType === 'almuerzo' || mealType === 'cena') {
        const totalProtein = foods.reduce((sum, f) => sum + f.protein, 0);
        const minProtein = targetCalories * 0.25 / 4; // 25% kcal de proteína
        
        if (totalProtein < minProtein * 0.7) {
          const mockFoods = this._getMockFoodsForMeal(mealType, dayIndex, needsGlycemicControl, input.allergies);
          const proteinFood = mockFoods.find(f => f.protein > 15);
          if (proteinFood) {
            foods.unshift(proteinFood);
            console.log(`Agregando proteína a ${mealType}: ${proteinFood.name} (${proteinFood.protein}g)`);
          }
        }
      }
      
      // NUEVO: Optimizar macros en lugar de solo calorías
      const macroTargets = this.getMacroTargetsForMeal(
        input.daily_calories,
        needsGlycemicControl ? 'Control Glucemico' : input.profile_type,
        mealType
      );
      
      foods = this.optimizeMealMacros(
        foods,
        macroTargets.protein,
        macroTargets.carbs,
        macroTargets.fat
      );
      
      // Validar macros de cada alimento
      foods = foods.map(food => this.validateFoodMacros(food));
      
      const totals = foods.reduce((acc: any, food: FoodItem) => ({
        calories: this._round(acc.calories + food.calories),
        protein: this._round(acc.protein + food.protein),
        carbs: this._round(acc.carbs + food.carbs),
        fat: this._round(acc.fat + food.fat)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
      
      meals.push({
        meal_type: mealType,
        time_suggestion: this.getSuggestedTime(mealType),
        foods,
        total_calories: totals.calories,
        total_protein: totals.protein,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
        notes: this.getMealNotes(mealType, needsGlycemicControl ? 'Control Glucemico' : input.profile_type, dayName)
      });
    }
    
    // Validar calorías del día completo
    let dayPlan: DayPlan = {
  date: new Date().toISOString().split('T')[0],
  day_name: dayName,
  meals,
  daily_totals: { 
    calories: 0, 
    protein: 0, 
    carbs: 0, 
    fat: 0, 
    fiber: 0 
  },
  hydration_goal_liters: 0,
  special_notes: ''
};

dayPlan = this.validateDayCalories(dayPlan, input.daily_calories);

return dayPlan.meals;
  }

  private _esAlimentoApropiado(food: FoodItem): boolean {
    const nameLower = food.name.toLowerCase();
    
    for (const noApropiado of this.ALIMENTOS_NO_APROPIADOS) {
      if (nameLower.includes(noApropiado)) {
        return false;
      }
    }
    
    if (food.calories > 800) {
      return false;
    }
    
    return true;
  }

  private _eliminarDuplicados(foods: FoodItem[]): FoodItem[] {
    const seen = new Set<string>();
    const unique: FoodItem[] = [];
    
    for (const food of foods) {
      const key = food.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(food);
      }
    }
    
    return unique;
  }

  // NUEVO: Evitar combinaciones de carbohidratos complejos
  private removeDoubleCarbs(foods: FoodItem[]): FoodItem[] {
    const carbFoods = foods.filter(f => f.carbs > 15);
    
    if (carbFoods.length <= 1) {
      return foods;
    }
    
    const hasLentils = carbFoods.some(f => 
      f.name.toLowerCase().includes('lenteja')
    );
    
    const hasBeans = carbFoods.some(f => 
      f.name.toLowerCase().includes('frijol') || 
      f.name.toLowerCase().includes('bean')
    );
    
    if (!hasLentils && !hasBeans) {
      return foods;
    }
    
    return foods.filter(f => {
      const name = f.name.toLowerCase();
      
      if (hasLentils && (name.includes('arroz') || name.includes('quinoa'))) {
        return false;
      }
      
      if (hasBeans && (name.includes('arroz') || name.includes('quinoa') || name.includes('papa'))) {
        return false;
      }
      
      return true;
    });
  }

  // NUEVO: Optimizar por macros en lugar de solo calorías
  private optimizeMealMacros(
    foods: FoodItem[],
    targetProtein: number,
    targetCarbs: number,
    targetFat: number
  ): FoodItem[] {
    
    const result = [...foods];
    
    // Identificar alimento principal de proteína
    const proteinFood = result.find(f => 
      f.protein > f.carbs && 
      f.protein > f.fat
    );
    
    // Identificar alimento principal de carbohidratos
    const carbFood = result.find(f => 
      f.carbs > f.protein && 
      f.carbs > f.fat
    );
    
    // Ajustar proteína
    if (proteinFood) {
      const factor = targetProtein / Math.max(proteinFood.protein, 1);
      const newServing = proteinFood.serving_size * Math.max(0.8, Math.min(1.8, factor));
      const scale = newServing / proteinFood.serving_size;
      
      proteinFood.serving_size = this._round(newServing);
      proteinFood.calories = this._round(proteinFood.calories * scale);
      proteinFood.protein = this._round(proteinFood.protein * scale);
      proteinFood.carbs = this._round(proteinFood.carbs * scale);
      proteinFood.fat = this._round(proteinFood.fat * scale);
      if (proteinFood.fiber) {
        proteinFood.fiber = this._round(proteinFood.fiber * scale);
      }
    }
    
    // Ajustar carbohidratos
    if (carbFood) {
      const factor = targetCarbs / Math.max(carbFood.carbs, 1);
      const newServing = carbFood.serving_size * Math.max(0.7, Math.min(1.5, factor));
      const scale = newServing / carbFood.serving_size;
      
      carbFood.serving_size = this._round(newServing);
      carbFood.calories = this._round(carbFood.calories * scale);
      carbFood.protein = this._round(carbFood.protein * scale);
      carbFood.carbs = this._round(carbFood.carbs * scale);
      carbFood.fat = this._round(carbFood.fat * scale);
      if (carbFood.fiber) {
        carbFood.fiber = this._round(carbFood.fiber * scale);
      }
    }
    
    return result;
  }

  // NUEVO: Calcular macros objetivo diarios
  private getMacroTargets(calories: number, profile: string) {
    const macros = this._getMacrosForProfile(profile);
    
    return {
      proteinGrams: this._round((calories * (macros.protein / 100)) / 4),
      carbsGrams: this._round((calories * (macros.carbs / 100)) / 4),
      fatGrams: this._round((calories * (macros.fat / 100)) / 9)
    };
  }

  // NUEVO: Calcular macros objetivo por comida
  private getMacroTargetsForMeal(
    dailyCalories: number,
    profile: string,
    mealType: MealType
  ) {
    const daily = this.getMacroTargets(dailyCalories, profile);
    
    const distribution: Record<MealType, number> = {
      desayuno: 0.20,
      media_manana: 0.10,
      almuerzo: 0.30,
      media_tarde: 0.10,
      cena: 0.20,
      colacion: 0.10
    };
    
    const factor = distribution[mealType];
    
    return {
      protein: this._round(daily.proteinGrams * factor),
      carbs: this._round(daily.carbsGrams * factor),
      fat: this._round(daily.fatGrams * factor)
    };
  }

  // NUEVO: Validar consistencia de macros
  private validateFoodMacros(food: FoodItem): FoodItem {
    const totalMacroCalories = 
      (food.protein * 4) + 
      (food.carbs * 4) + 
      (food.fat * 9);
    
    if (totalMacroCalories > food.calories * 1.4) {
      console.warn('Macros inconsistentes:', food.name);
      return {
        ...food,
        protein: 0,
        fat: 0
      };
    }
    
    return food;
  }

  // NUEVO: Validar calorías del día ±5%
  private validateDayCalories(day: DayPlan, targetCalories: number): DayPlan {
    const min = targetCalories * 0.95;
    const max = targetCalories * 1.05;
    
    const current = day.daily_totals.calories;
    
    if (current >= min && current <= max) {
      return day;
    }
    
    const factor = targetCalories / current;
    
    day.meals.forEach(meal => {
      meal.foods.forEach(food => {
        if (food.serving_unit === 'unidad') {
          return;
        }
        
        food.serving_size = this._round(food.serving_size * factor);
        food.calories = this._round(food.calories * factor);
        food.protein = this._round(food.protein * factor);
        food.carbs = this._round(food.carbs * factor);
        food.fat = this._round(food.fat * factor);
        if (food.fiber) {
          food.fiber = this._round(food.fiber * factor);
        }
      });
    });
    
    // Recalcular totales
    day.daily_totals = day.meals.reduce((acc: any, meal: MealPlan) => ({
      calories: this._round(acc.calories + meal.total_calories),
      protein: this._round(acc.protein + meal.total_protein),
      carbs: this._round(acc.carbs + meal.total_carbs),
      fat: this._round(acc.fat + meal.total_fat),
      fiber: this._round((acc.fiber || 0) + meal.foods.reduce((s: number, f: FoodItem) => s + (f.fiber || 0), 0))
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    
    return day;
  }

  private async selectFoodsForMeal(
    input: PlanGenerationInput, 
    mealType: MealType, 
    targetCalories: number, 
    dayIndex: number,
    needsGlycemicControl: boolean
  ): Promise<FoodItem[]> {
    
    const searchQuery = this.getMainFoodQuery(mealType, input.preferences.dietary_style, dayIndex, needsGlycemicControl);
    
    if (mealType === 'almuerzo' || mealType === 'cena') {
      return this._getMockFoodsForMeal(mealType, dayIndex, needsGlycemicControl, input.allergies)
        .slice(0, 3)
        .map((f: FoodItem) => this._roundFoodValues(f));
    }
    
    if (['media_manana', 'media_tarde', 'colacion'].includes(mealType)) {
      const snackIndex = this._getSnackIndex(mealType, dayIndex);
      return this._getMockFoodsForMeal(mealType, snackIndex, needsGlycemicControl, input.allergies)
        .slice(0, 2)
        .map((f: FoodItem) => this._roundFoodValues(f));
    }
    
    try {
      const apiFoods: FoodItem[] = await firstValueFrom(
        this.fatsecretApi.searchFoods(searchQuery, 10).pipe(timeout(10000))
      );
      
      const filtered = apiFoods
        .filter((food: FoodItem) => this._esAlimentoApropiado(food))
        .filter((food: FoodItem) => food.calories > 0 && food.calories < 400)
        .slice(0, 2);
      
      // SOLUCION 2: Garantizar 2 alimentos en desayuno
      if (filtered.length >= 1) {
        if (filtered.length === 1) {
          const backup = this._getMockFoodsForMeal('desayuno', dayIndex, needsGlycemicControl, input.allergies);
          const backupFiltered = backup.filter(f => 
            !filtered.some(ff => ff.name.toLowerCase() === f.name.toLowerCase())
          );
          if (backupFiltered.length > 0) {
            filtered.push(backupFiltered[0]);
          }
        }
        
        const caloriesPerFood = targetCalories / filtered.length;
        return filtered
          .map((f: FoodItem) => ({
            ...f,
            name: this._translateFoodName(f.name)
          }))
          .map((f: FoodItem) => this._ajustarPorcionInteligente(f, caloriesPerFood))
          .map((f: FoodItem) => this._roundFoodValues(f));
      }
    } catch (error) {
      console.warn(`USDA fallback para ${mealType}`);
    }
    
    return this._getMockFoodsForMeal('desayuno', dayIndex, needsGlycemicControl, input.allergies)
      .slice(0, 2)
      .map((f: FoodItem) => this._roundFoodValues(f));
  }

  private _ajustarPorcionInteligente(food: FoodItem, targetCalories: number): FoodItem {
    const nameLower = food.name.toLowerCase();
    
    const esHuevo = nameLower.includes('huevo') || nameLower.includes('egg');
    const esUnidad = food.serving_unit?.toLowerCase() === 'unidad' || 
                     food.serving_unit?.toLowerCase() === 'unit' ||
                     esHuevo;
    
    if (esHuevo || esUnidad) {
      const CALORIAS_POR_HUEVO = 78;
      const GRAMOS_POR_HUEVO = 50;
      const MAX_HUEVOS = 3;
      
      let unidadesNecesarias = targetCalories / CALORIAS_POR_HUEVO;
      unidadesNecesarias = Math.min(unidadesNecesarias, MAX_HUEVOS);
      unidadesNecesarias = Math.max(1, Math.round(unidadesNecesarias));
      
      const gramosTotales = unidadesNecesarias * GRAMOS_POR_HUEVO;
      const factor = gramosTotales / (food.serving_size || 100);
      
      return {
        ...food,
        serving_size: unidadesNecesarias,
        serving_unit: 'unidad',
        calories: this._round(CALORIAS_POR_HUEVO * unidadesNecesarias),
        protein: this._round(6.3 * unidadesNecesarias),
        carbs: this._round(0.6 * unidadesNecesarias),
        fat: this._round(5.3 * unidadesNecesarias),
        fiber: 0
      };
    }
    
    const caloriasPorGramo = food.calories / (food.serving_size || 100);
    const porcionIdeal = targetCalories / caloriasPorGramo;
    const porcionFinal = Math.max(10, Math.min(300, porcionIdeal));
    const factor = porcionFinal / (food.serving_size || 100);
    
    return {
      ...food,
      serving_size: Math.round(porcionFinal),
      serving_unit: 'g',
      calories: this._round(food.calories * factor),
      protein: this._round(food.protein * factor),
      carbs: this._round(food.carbs * factor),
      fat: this._round(food.fat * factor),
      fiber: food.fiber ? this._round(food.fiber * factor) : undefined
    };
  }

  private _translateFoodName(name: string): string {
    const EN_TO_ES_FOODS: Record<string, string> = {
      'chicken breast, grilled': 'Pechuga de pollo a la plancha',
      'chicken breast, roasted': 'Pechuga de pollo asada',
      'chicken breast, skinless': 'Pechuga de pollo sin piel',
      'chicken breast': 'Pechuga de pollo',
      'chicken thigh': 'Muslo de pollo',
      'chicken': 'Pollo',
      'turkey': 'Pavo',
      'beef': 'Res',
      'pork': 'Cerdo',
      'fish, white': 'Pescado blanco',
      'white fish': 'Pescado blanco',
      'salmon': 'Salmón',
      'tuna': 'Atún',
      'cod': 'Bacalao',
      'tilapia': 'Tilapia',
      'shrimp': 'Camarones',
      'tofu': 'Tofu',
      'lentils': 'Lentejas',
      'chickpeas': 'Garbanzos',
      'black beans': 'Frijoles negros',
      'egg, whole, boiled': 'Huevo de gallina cocido',
      'egg': 'Huevo',
      'rice, white, cooked': 'Arroz blanco cocido',
      'rice, brown, cooked': 'Arroz integral cocido',
      'rice': 'Arroz',
      'quinoa, cooked': 'Quinoa cocida',
      'quinoa': 'Quinoa',
      'oatmeal': 'Avena',
      'oats': 'Avena',
      'bread, whole wheat': 'Pan integral de trigo',
      'bread': 'Pan',
      'pasta': 'Pasta',
      'milk': 'Leche',
      'yogurt': 'Yogur',
      'greek yogurt': 'Yogur griego',
      'cheese': 'Queso',
      'cheese, cottage': 'Queso cottage',
      'broccoli': 'Brócoli',
      'carrot': 'Zanahoria',
      'spinach': 'Espinacas',
      'cucumber': 'Pepino',
      'tomato': 'Tomate',
      'apple': 'Manzana',
      'banana': 'Banana',
      'orange': 'Naranja',
      'pear': 'Pera',
      'strawberry': 'Fresa',
      'blueberry': 'Arándano',
      'almonds': 'Almendras',
      'walnuts': 'Nueces',
      'peanuts': 'Maní',
      'avocado': 'Aguacate'
    };
    
    const nameLower = name.toLowerCase().trim();
    if (EN_TO_ES_FOODS[nameLower]) return EN_TO_ES_FOODS[nameLower];
    
    const sortedKeys = Object.keys(EN_TO_ES_FOODS).sort((a, b) => b.length - a.length);
    for (const en of sortedKeys) {
      if (nameLower.includes(en)) return EN_TO_ES_FOODS[en];
    }
    
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private _getSnackIndex(mealType: MealType, dayIndex: number): number {
    const offsets: Record<string, number> = {
      'media_manana': 0,
      'media_tarde': 2,
      'colacion': 4
    };
    return (dayIndex + (offsets[mealType] || 0)) % 7;
  }

  private getMainFoodQuery(
    mealType: MealType, 
    dietaryStyle: DietaryStyle, 
    dayIndex: number, 
    needsGlycemicControl: boolean
  ): string {
    if (needsGlycemicControl) {
      const glycemicOptions: Record<MealType, string[]> = {
        desayuno: ['egg', 'greek yogurt', 'oatmeal', 'cottage cheese'],
        media_manana: ['almonds', 'apple', 'pear', 'berries'],
        almuerzo: ['grilled chicken', 'salmon', 'white fish', 'lentils'],
        media_tarde: ['greek yogurt', 'walnuts', 'cucumber'],
        cena: ['grilled fish', 'chicken breast', 'turkey', 'vegetable soup'],
        colacion: ['cottage cheese', 'almonds']
      };
      return glycemicOptions[mealType]?.[dayIndex % glycemicOptions[mealType].length] || 'vegetables';
    }
    
    const breakfastOptions = ['oatmeal', 'egg', 'whole wheat bread', 'greek yogurt'];
    const lunchOptions = ['chicken breast', 'white fish', 'lentils', 'quinoa'];
    const dinnerOptions = ['vegetable soup', 'grilled fish', 'tofu', 'salad'];
    const snackOptions = ['apple', 'almonds', 'greek yogurt', 'carrot'];
    
    let options: string[];
    switch(mealType) {
      case 'desayuno': options = breakfastOptions; break;
      case 'almuerzo': options = lunchOptions; break;
      case 'cena': options = dinnerOptions; break;
      case 'media_manana':
      case 'media_tarde':
      case 'colacion': options = snackOptions; break;
      default: return 'vegetables';
    }
    
    return options[dayIndex % options.length];
  }

  private _getMockFoodsForMeal(
    mealType: MealType, 
    dayIndex: number, 
    needsGlycemicControl: boolean,
    allergies: string[]
  ): FoodItem[] {
    
    const mockDB: Record<string, FoodItem[]> = {
      desayuno: [
        { food_id: 'mock_avena_1', name: 'Avena en hojuelas', brand: 'Quaker', serving_size: 40, serving_unit: 'g', calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4 },
        { food_id: 'mock_huevo_1', name: 'Huevo de gallina cocido', brand: '', serving_size: 1, serving_unit: 'unidad', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0 },
        { food_id: 'mock_pan_1', name: 'Pan integral de trigo', brand: '', serving_size: 1, serving_unit: 'rebanada', calories: 80, protein: 4, carbs: 15, fat: 1, fiber: 2 },
        { food_id: 'mock_yogur_1', name: 'Yogur natural sin azúcar', brand: '', serving_size: 125, serving_unit: 'g', calories: 70, protein: 6, carbs: 8, fat: 2, fiber: 0 }
      ],
      proteina_principal: [
        { food_id: 'mock_pollo_1', name: 'Pechuga de pollo a la plancha', brand: '', serving_size: 120, serving_unit: 'g', calories: 198, protein: 37.2, carbs: 0, fat: 4.3, fiber: 0 },
        { food_id: 'mock_pollo_2', name: 'Pollo guisado casero', brand: '', serving_size: 120, serving_unit: 'g', calories: 228, protein: 30, carbs: 6, fat: 9.6, fiber: 1.2 },
        { food_id: 'mock_pescado_1', name: 'Filete de pescado blanco a la plancha', brand: '', serving_size: 120, serving_unit: 'g', calories: 144, protein: 26.4, carbs: 0, fat: 3.6, fiber: 0 },
        { food_id: 'mock_salmón_1', name: 'Salmón al horno', brand: '', serving_size: 120, serving_unit: 'g', calories: 247, protein: 26.4, carbs: 0, fat: 15.6, fiber: 0 },
        { food_id: 'mock_lentejas_1', name: 'Lentejas cocidas', brand: '', serving_size: 100, serving_unit: 'g', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8 },
        { food_id: 'mock_tofu_1', name: 'Tofu firme', brand: '', serving_size: 100, serving_unit: 'g', calories: 144, protein: 17, carbs: 3, fat: 9, fiber: 2 }
      ],
      carbohidrato_principal: [
        { food_id: 'mock_arroz_integral_1', name: 'Arroz integral cocido', brand: '', serving_size: 150, serving_unit: 'g', calories: 168, protein: 3.9, carbs: 34.5, fat: 1.4, fiber: 2.7 },
        { food_id: 'mock_quinoa_1', name: 'Quinoa cocida', brand: '', serving_size: 100, serving_unit: 'g', calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8 },
        { food_id: 'mock_lentejas_carb_1', name: 'Lentejas cocidas', brand: '', serving_size: 100, serving_unit: 'g', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8 },
        { food_id: 'mock_papa_1', name: 'Papa cocida', brand: '', serving_size: 150, serving_unit: 'g', calories: 131, protein: 2.9, carbs: 30, fat: 0.2, fiber: 3.3 }
      ],
      verduras_bajo_ig: [
        { food_id: 'mock_brocoli_1', name: 'Brócoli cocido', brand: '', serving_size: 100, serving_unit: 'g', calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3 },
        { food_id: 'mock_espinaca_1', name: 'Espinacas cocidas', brand: '', serving_size: 100, serving_unit: 'g', calories: 23, protein: 3, carbs: 3.8, fat: 0.3, fiber: 2.4 },
        { food_id: 'mock_zanahoria_1', name: 'Zanahoria cocida', brand: '', serving_size: 100, serving_unit: 'g', calories: 35, protein: 0.8, carbs: 8, fat: 0.2, fiber: 2.8 },
        { food_id: 'mock_pepino_1', name: 'Pepino en rodajas', brand: '', serving_size: 100, serving_unit: 'g', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 }
      ],
      snack_rotativo: [
        { food_id: 'mock_almendras_1', name: 'Almendras crudas', brand: '', serving_size: 30, serving_unit: 'g', calories: 170, protein: 6, carbs: 6, fat: 15, fiber: 3.5 },
        { food_id: 'mock_manzana_1', name: 'Manzana con cáscara', brand: '', serving_size: 150, serving_unit: 'g', calories: 78, protein: 0.5, carbs: 21, fat: 0.3, fiber: 3.6 },
        { food_id: 'mock_yogur_griego_1', name: 'Yogur griego natural', brand: '', serving_size: 150, serving_unit: 'g', calories: 90, protein: 16, carbs: 6, fat: 0, fiber: 0 },
        { food_id: 'mock_pepino_2', name: 'Pepino en rodajas', brand: '', serving_size: 100, serving_unit: 'g', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
        { food_id: 'mock_cottage_1', name: 'Queso cottage', brand: '', serving_size: 100, serving_unit: 'g', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0 },
        { food_id: 'mock_pera_1', name: 'Pera fresca', brand: '', serving_size: 150, serving_unit: 'g', calories: 86, protein: 0.6, carbs: 22.5, fat: 0.2, fiber: 4.7 },
        { food_id: 'mock_nueces_1', name: 'Nueces crudas', brand: '', serving_size: 30, serving_unit: 'g', calories: 185, protein: 4.3, carbs: 3.9, fat: 18.5, fiber: 1.9 },
        { food_id: 'mock_zanahoria_2', name: 'Zanahoria en bastones', brand: '', serving_size: 100, serving_unit: 'g', calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 }
      ]
    };

    let candidates: FoodItem[] = [];

    if (mealType === 'desayuno') {
      const desayunoRotativo: [string, string][] = [
        ['mock_avena_1', 'mock_huevo_1'],
        ['mock_pan_1', 'mock_yogur_1'],
        ['mock_avena_1', 'mock_yogur_1'],
        ['mock_huevo_1', 'mock_pan_1'],
        ['mock_avena_1', 'mock_huevo_1'],
        ['mock_pan_1', 'mock_yogur_1'],
        ['mock_huevo_1', 'mock_yogur_1']
      ];
      const [food1, food2] = desayunoRotativo[dayIndex % desayunoRotativo.length];
      candidates = mockDB['desayuno'].filter(f => f.food_id === food1 || f.food_id === food2);

    } else if (mealType === 'almuerzo' || mealType === 'cena') {
      const proteins = mockDB['proteina_principal'];
      const carbs = mockDB['carbohidrato_principal'];
      const veggies = mockDB['verduras_bajo_ig'];
      
      candidates = [
        proteins[dayIndex % proteins.length],
        carbs[dayIndex % carbs.length],
        veggies[dayIndex % veggies.length]
      ];

    } else {
      const snackPool = mockDB['snack_rotativo'];
      const idx1 = dayIndex % snackPool.length;
      const idx2 = (dayIndex + 1) % snackPool.length;
      candidates = [snackPool[idx1], snackPool[idx2]];
    }

    return candidates
      .filter((f: FoodItem) => !allergies.some((a: string) => 
        f.name.toLowerCase().includes(a.toLowerCase())
      ))
      .slice(0, 3);
  }

  private _getMinimumFoodsForMeal(mealType: MealType, needsGlycemicControl: boolean, allergies: string[]): FoodItem[] {
    const minimums: Record<MealType, FoodItem[]> = {
      desayuno: [
        { food_id: 'min_avena', name: 'Avena cocida', serving_size: 40, serving_unit: 'g', calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4 },
        { food_id: 'min_huevo', name: 'Huevo cocido', serving_size: 1, serving_unit: 'unidad', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0 }
      ],
      almuerzo: [
        { food_id: 'min_pollo', name: 'Pechuga de pollo', serving_size: 120, serving_unit: 'g', calories: 198, protein: 37.2, carbs: 0, fat: 4.3, fiber: 0 },
        { food_id: 'min_arroz_integral', name: 'Arroz integral', serving_size: 150, serving_unit: 'g', calories: 168, protein: 3.9, carbs: 34.5, fat: 1.4, fiber: 2.7 },
        { food_id: 'min_brocoli', name: 'Brócoli', serving_size: 100, serving_unit: 'g', calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3 }
      ],
      cena: [
        { food_id: 'min_pescado', name: 'Pescado blanco', serving_size: 120, serving_unit: 'g', calories: 144, protein: 26.4, carbs: 0, fat: 3.6, fiber: 0 },
        { food_id: 'min_quinoa', name: 'Quinoa', serving_size: 100, serving_unit: 'g', calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8 }
      ],
      media_manana: [
        { food_id: 'min_yogur', name: 'Yogur natural', serving_size: 125, serving_unit: 'g', calories: 70, protein: 6, carbs: 8, fat: 2, fiber: 0 },
        { food_id: 'min_manzana', name: 'Manzana', serving_size: 150, serving_unit: 'g', calories: 78, protein: 0.5, carbs: 21, fat: 0.3, fiber: 3.6 }
      ],
      media_tarde: [
        { food_id: 'min_almendras', name: 'Almendras', serving_size: 30, serving_unit: 'g', calories: 170, protein: 6, carbs: 6, fat: 15, fiber: 3.5 }
      ],
      colacion: [
        { food_id: 'min_cottage', name: 'Cottage cheese', serving_size: 100, serving_unit: 'g', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0 }
      ]
    };
    
    return minimums[mealType].filter((f: FoodItem) => 
      !allergies.some((a: string) => f.name.toLowerCase().includes(a.toLowerCase()))
    );
  }

  private _roundFoodValues(food: FoodItem): FoodItem {
    return {
      ...food,
      calories: this._round(food.calories),
      protein: this._round(food.protein),
      carbs: this._round(food.carbs),
      fat: this._round(food.fat),
      fiber: food.fiber ? this._round(food.fiber) : undefined,
      sodium: food.sodium ? this._round(food.sodium) : undefined
    };
  }

  private _round(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private calculateMealDistribution(profile: string, activity: ActivityLevel): Record<MealType, number> {
    const distributions: Record<string, Record<MealType, number>> = {
      'Normocalorico': { desayuno: 0.25, media_manana: 0.10, almuerzo: 0.35, media_tarde: 0.10, cena: 0.15, colacion: 0.05 },
      'Control Glucemico': { desayuno: 0.20, media_manana: 0.15, almuerzo: 0.30, media_tarde: 0.15, cena: 0.15, colacion: 0.05 },
      'Hipocalorico': { desayuno: 0.30, media_manana: 0.05, almuerzo: 0.40, media_tarde: 0.05, cena: 0.15, colacion: 0.05 },
      'Hipo-grasa': { desayuno: 0.25, media_manana: 0.10, almuerzo: 0.35, media_tarde: 0.10, cena: 0.15, colacion: 0.05 }
    };
    return distributions[profile] || distributions['Normocalorico'];
  }

  private getSuggestedTime(mealType: MealType): string {
    const times: Record<MealType, string> = {
      desayuno: '07:00', media_manana: '10:00', almuerzo: '13:00',
      media_tarde: '16:00', cena: '19:30', colacion: '21:00'
    };
    return times[mealType];
  }

  private calculateHydrationGoal(activity: ActivityLevel): number {
    const goals: Record<ActivityLevel, number> = {
      sedentario: 2.0, ligera: 2.5, moderada: 3.0, intensa: 3.5
    };
    return goals[activity] || 2.5;
  }

  private getDailyNotes(profile: string, dayIndex: number): string {
    if (profile === 'Control Glucemico') {
      const notes = [
        'Monitorear glucosa 2h post-almuerzo',
        'Evitar picos de carbohidratos en la tarde',
        'Incluir fibra en cada comida para estabilidad glucémica',
        'Recordar hidratación constante',
        'Cena ligera para evitar hipoglucemia nocturna',
        'Revisar síntomas de hipoglucemia',
        'Planificar snacks de emergencia (15g carbohidratos)'
      ];
      return notes[dayIndex % notes.length];
    }
    
    const notes: Record<string, string[]> = {
      'Hipocalorico': [
        'Enfocarse en alimentos de alta saciedad',
        'Evitar bebidas azucaradas',
        'Caminar 30 min post-comidas principales',
        'Registrar hambre emocional vs física',
        'Preparar snacks saludables con anticipación',
        'Dormir 7-8h para regular hormonas del apetito',
        'Celebrar pequeños logros no relacionados con peso'
      ]
    };
    return notes[profile]?.[dayIndex % (notes[profile]?.length || 1)] || '';
  }

  private getMealNotes(mealType: MealType, profile: string, _dayName: string): string {
    if (profile === 'Control Glucemico') {
      if (mealType === 'desayuno') return 'Incluir proteína para estabilizar glucosa matutina';
      if (mealType === 'cena') return 'Cena ligera, al menos 3h antes de dormir';
      return 'Combinar carbohidratos con proteína/fibra para menor impacto glucémico';
    }
    if (profile === 'Hipocalorico' && mealType === 'cena') {
      return 'Cena al menos 3h antes de dormir para mejor metabolismo';
    }
    return '';
  }

  private getFoodsToAvoid(profile: string, allergies: string[]): string[] {
    const baseAvoid: Record<string, string[]> = {
      'Control Glucemico': ['azúcar refinada', 'jugos industriales', 'pan blanco', 'arroz blanco en exceso', 'bebidas azucaradas'],
      'Hipocalorico': ['fritos', 'salsas cremosas', 'bebidas azucaradas', 'snacks ultraprocesados'],
      'Hipo-grasa': ['manteca', 'embutidos', 'frituras', 'productos de pastelería']
    };
    return [...(baseAvoid[profile] || []), ...allergies];
  }

  private getWeeklyFocusAreas(profile: string): string[] {
    const focuses: Record<string, string[]> = {
      'Normocalorico': ['Mantener horarios regulares', 'Variedad de colores en vegetales', 'Hidratación constante'],
      'Control Glucemico': ['Monitoreo glucémico', 'Carbohidratos de bajo índice glucémico', 'Fibra en cada comida'],
      'Hipocalorico': ['Saciedad con baja densidad calórica', 'Actividad física diaria', 'Mindful eating'],
      'Hipo-grasa': ['Grasas saludables (aguacate, nueces)', 'Cocción al vapor/horno', 'Lectura de etiquetas']
    };
    return focuses[profile] || focuses['Normocalorico'];
  }

  private generateMonthlySummary(week1: WeekPlan): GeneratedNutritionPlan['plan']['monthly_summary'] {
    return {
      total_days: 28,
      avg_calories: week1.weekly_goals.avg_daily_calories,
      adherence_tips: [
        'Preparar comidas con anticipación los domingos',
        'Mantener un diario de alimentación las primeras 2 semanas',
        'Revisar progreso con el profesional en la semana 2 y 4',
        'Ajustar porciones según saciedad y energía'
      ],
      progress_checkpoints: [
        { week: 1, goal: 'Adaptación a nuevos horarios y alimentos' },
        { week: 2, goal: 'Evaluación de saciedad y energía diaria' },
        { week: 3, goal: 'Ajuste fino de porciones según respuesta' },
        { week: 4, goal: 'Planificación de mantenimiento a largo plazo' }
      ]
    };
  }

  private getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }

  async saveCompletePlan(plan: GeneratedNutritionPlan, registro_id: string): Promise<PlanSaveResponse> {
    const token = localStorage.getItem('token');
    
    const payload = {
      paciente_id: plan.patient_id,
      medico_id: null,
      perfil_recomendado: plan.profile_type,
      perfil_recomendado_id: plan.profile_id,
      confianza_ia: plan.metadata?.ai_confidence || null,
      respuesta_ia_completa: plan.metadata || null,
      datos_clinicos_base: null,
      objetivos: plan.recommendations?.additional_notes 
        ? [plan.recommendations.main, plan.recommendations.additional_notes] 
        : [plan.recommendations.main],
      recomendaciones: plan.recommendations.main,
      duracion_semanas: 4,
      notas_adicionales: plan.recommendations?.additional_notes || null,
      alergias: plan.restrictions?.allergies || [],
      preferencias: plan.preferences,
      plan_detallado: plan.plan,
      estado: 'activo',
      validado_por_ia: true,
      fecha_creacion: plan.generated_at
    };

    try {
      const response = await firstValueFrom(
        this.http.post<PlanSaveResponse>(
          this.API_URL,
          payload,
          {
            headers: new HttpHeaders({
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            })
          }
        )
      );
      return response;
    } catch (error: any) {
      console.error('Error guardando plan:', error);
      return { error: true, mensaje: error.error?.mensaje || 'Error al guardar el plan' };
    }
  }

  async updatePlanDetail(planId: string, planDetallado: GeneratedNutritionPlan['plan']): Promise<PlanSaveResponse> {
    const token = localStorage.getItem('token');
    
    try {
      const response = await firstValueFrom(
        this.http.put<PlanSaveResponse>(
          `${this.API_URL}/${planId}/detallado`,
          { plan_detallado: planDetallado },
          {
            headers: new HttpHeaders({
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            })
          }
        )
      );
      return response;
    } catch (error: any) {
      console.error('Error actualizando plan detallado:', error);
      return { error: true, mensaje: error.error?.mensaje || 'Error al actualizar el plan detallado' };
    }
  }
}