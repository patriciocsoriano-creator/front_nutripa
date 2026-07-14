import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
  ActivityLevel
} from '../models/nutrition-plan.model';
import { environment } from 'src/environments/environment';

interface CuratedFood {
  name: string;
  serving_size: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

@Injectable({ providedIn: 'root' })
export class NutritionPlanService {

  private readonly API_URL = `${environment.apiUrl}/nutricionapp-api/medico/plan-nutricional`;

  private readonly ALIMENTOS_NO_APROPIADOS = [
    'especia', 'fenogreco', 'galleta', 'cookie', 'spice', 'seasoning',
    'candy', 'dulce', 'soda', 'refresco', 'alcohol', 'beer', 'wine',
    'aceite', 'manteca', 'grasa', 'sugar', 'azúcar', 'salt', 'sal',
    'extract', 'extracto', 'flavoring', 'saborizante', 'coloring',
    'supplement', 'suplemento', 'powder', 'polvo', 'concentrate'
  ];

  // CATÁLOGO CURADO Y SEPARADO POR TIPO DE COMIDA PARA CONTROL TOTAL
  private readonly CURATED_CATALOG: Record<string, CuratedFood[]> = {
    desayuno_carbs: [
      { name: 'Avena en hojuelas', serving_size: 40, unit: 'g', calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4 },
      { name: 'Pan integral de trigo', serving_size: 1, unit: 'rebanada', calories: 80, protein: 4, carbs: 15, fat: 1, fiber: 2 },
      { name: 'Tortilla de maíz', serving_size: 1, unit: 'unidad', calories: 52, protein: 1.4, carbs: 10.7, fat: 0.7, fiber: 1.4 },
      { name: 'Arepa de maíz', serving_size: 1, unit: 'unidad', calories: 150, protein: 3, carbs: 30, fat: 2, fiber: 2 }
    ],
    desayuno_proteins: [
      { name: 'Huevo de gallina', serving_size: 1, unit: 'unidad', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0 },
      { name: 'Yogur griego natural', serving_size: 150, unit: 'g', calories: 90, protein: 16, carbs: 6, fat: 0, fiber: 0 },
      { name: 'Queso fresco', serving_size: 50, unit: 'g', calories: 130, protein: 10, carbs: 2, fat: 9, fiber: 0 },
      { name: 'Queso cottage', serving_size: 100, unit: 'g', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0 }
    ],
    almuerzo_proteins: [
      { name: 'Pechuga de pollo a la plancha', serving_size: 120, unit: 'g', calories: 198, protein: 37.2, carbs: 0, fat: 4.3, fiber: 0 },
      { name: 'Filete de pescado blanco', serving_size: 120, unit: 'g', calories: 144, protein: 26.4, carbs: 0, fat: 3.6, fiber: 0 },
      { name: 'Salmón al horno', serving_size: 120, unit: 'g', calories: 247, protein: 26.4, carbs: 0, fat: 15.6, fiber: 0 },
      { name: 'Lentejas cocidas', serving_size: 100, unit: 'g', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8 },
      { name: 'Frijoles negros cocidos', serving_size: 100, unit: 'g', calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5, fiber: 8.7 },
      { name: 'Carne de res magra', serving_size: 100, unit: 'g', calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 },
      { name: 'Tofu firme', serving_size: 100, unit: 'g', calories: 144, protein: 17, carbs: 3, fat: 9, fiber: 2 },
      { name: 'Atún en agua', serving_size: 100, unit: 'g', calories: 116, protein: 25.5, carbs: 0, fat: 0.8, fiber: 0 }
    ],
    almuerzo_carbs: [
      { name: 'Arroz integral cocido', serving_size: 150, unit: 'g', calories: 168, protein: 3.9, carbs: 34.5, fat: 1.4, fiber: 2.7 },
      { name: 'Quinoa cocida', serving_size: 100, unit: 'g', calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8 },
      { name: 'Papa cocida', serving_size: 150, unit: 'g', calories: 131, protein: 2.9, carbs: 30, fat: 0.2, fiber: 3.3 },
      { name: 'Camote cocido', serving_size: 150, unit: 'g', calories: 129, protein: 1.6, carbs: 30, fat: 0.2, fiber: 4.5 },
      { name: 'Pasta integral cocida', serving_size: 100, unit: 'g', calories: 124, protein: 5.3, carbs: 26.5, fat: 0.5, fiber: 3.9 },
      { name: 'Plátano verde cocido', serving_size: 100, unit: 'g', calories: 122, protein: 1.3, carbs: 31, fat: 0.4, fiber: 2.3 }
    ],
    almuerzo_veggies: [
      { name: 'Brócoli cocido', serving_size: 100, unit: 'g', calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3 },
      { name: 'Espinacas salteadas', serving_size: 100, unit: 'g', calories: 23, protein: 3, carbs: 3.8, fat: 0.3, fiber: 2.4 },
      { name: 'Zanahoria cocida', serving_size: 100, unit: 'g', calories: 35, protein: 0.8, carbs: 8, fat: 0.2, fiber: 2.8 },
      { name: 'Ensalada mixta', serving_size: 100, unit: 'g', calories: 20, protein: 1, carbs: 4, fat: 0.2, fiber: 1.5 },
      { name: 'Ejotes cocidos', serving_size: 100, unit: 'g', calories: 31, protein: 1.8, carbs: 7, fat: 0.2, fiber: 2.7 },
      { name: 'Calabacín a la plancha', serving_size: 100, unit: 'g', calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1 }
    ],
    snack_fruits: [
      { name: 'Manzana', serving_size: 150, unit: 'g', calories: 78, protein: 0.5, carbs: 21, fat: 0.3, fiber: 3.6 },
      { name: 'Pera', serving_size: 150, unit: 'g', calories: 86, protein: 0.6, carbs: 22.5, fat: 0.2, fiber: 4.7 },
      { name: 'Fresas', serving_size: 150, unit: 'g', calories: 48, protein: 1, carbs: 11.7, fat: 0.5, fiber: 3 },
      { name: 'Arándanos', serving_size: 100, unit: 'g', calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4 },
      { name: 'Plátano', serving_size: 120, unit: 'g', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1 },
      { name: 'Naranja', serving_size: 150, unit: 'g', calories: 70, protein: 1.4, carbs: 17.6, fat: 0.2, fiber: 3.8 },
      { name: 'Kiwi', serving_size: 100, unit: 'g', calories: 61, protein: 1.1, carbs: 14.7, fat: 0.5, fiber: 3 }
    ],
    snack_extras: [
      { name: 'Almendras crudas', serving_size: 30, unit: 'g', calories: 170, protein: 6, carbs: 6, fat: 15, fiber: 3.5 },
      { name: 'Nueces', serving_size: 30, unit: 'g', calories: 185, protein: 4.3, carbs: 3.9, fat: 18.5, fiber: 1.9 },
      { name: 'Semillas de chía', serving_size: 15, unit: 'g', calories: 73, protein: 2.5, carbs: 6.3, fat: 4.6, fiber: 5.1 },
      { name: 'Palta (Aguacate)', serving_size: 50, unit: 'g', calories: 80, protein: 1, carbs: 4.3, fat: 7.3, fiber: 3.4 }
    ]
  };

  constructor(private http: HttpClient) {}

  async generatePlan(input: PlanGenerationInput): Promise<GeneratedNutritionPlan> {
    const perfilesValidos = ['Normocalorico', 'Control Glucemico', 'Hipocalorico', 'Hipo-grasa'] as const;
    
    const perfilNormalizado = input.profile_type
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    
    const perfilEncontrado = perfilesValidos.find(p => 
      p.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === perfilNormalizado
    ) || 'Normocalorico';
    
    input.profile_type = perfilEncontrado;
    
    const needsGlycemicControl = this._needsGlycemicControl(input);
    const profileType = needsGlycemicControl ? 'Control Glucemico' as const : perfilEncontrado;
    
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
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        ai_confidence: needsGlycemicControl ? 0.98 : 0.95,
        clinical_validation_required: needsGlycemicControl,
        source: 'local_database',
        glycemic_control_applied: needsGlycemicControl
      }
    };
  }

  private _needsGlycemicControl(input: PlanGenerationInput): boolean {
    const perfilNormalizado = input.profile_type.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (perfilNormalizado === 'Control Glucemico') return true;
    
    const clinical = (input as any).datos_clinicos_base;
    if (!clinical) return false;
    
    if (clinical.glucosa_ayunas && clinical.glucosa_ayunas >= 126) return true;
    if (clinical.hba1c && clinical.hba1c >= 6.5) return true;
    
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
        additional_notes: base.additional_notes ? `${base.additional_notes}. Evitar picos glucémicos.` : 'Evitar picos glucémicos.'
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
    const usedFoodsThisWeek = new Set<string>();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('es-EC', { weekday: 'long' });
      
      const meals = await this.generateDayMeals(input, mealDist, dayName, i, needsGlycemicControl, usedFoodsThisWeek);
      
      const daily_totals = meals.reduce((acc: any, meal: MealPlan) => ({
        calories: this._round(acc.calories + meal.total_calories),
        protein: this._round(acc.protein + meal.total_protein),
        carbs: this._round(acc.carbs + meal.total_carbs),
        fat: this._round(acc.fat + meal.total_fat),
        fiber: this._round((acc.fiber || 0) + meal.foods.reduce((s: number, f: FoodItem) => s + (f.fiber || 0), 0))
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
      
      let specialNotes = this.getDailyNotes(needsGlycemicControl ? 'Control Glucemico' : input.profile_type, i);
      if (daily_totals.fiber < 25) specialNotes += ' Incrementar fibra.';
      
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
    needsGlycemicControl: boolean,
    usedFoodsThisWeek: Set<string>
  ): Promise<MealPlan[]> {
    const meals: MealPlan[] = [];
    const mealOrder: MealType[] = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena', 'colacion'];
    const usedFoodsToday = new Set<string>();
    
    for (const mealType of mealOrder) {
      if (mealDist[mealType] === 0) continue;
      
      const targetCalories = Math.round(input.daily_calories * mealDist[mealType]);
      let foods: FoodItem[] = [];
      
      if (mealType === 'desayuno') {
        foods = this.selectDesayuno(usedFoodsThisWeek, usedFoodsToday);
      } else if (mealType === 'almuerzo' || mealType === 'cena') {
        foods = this.selectAlmuerzoCena(usedFoodsThisWeek, usedFoodsToday);
      } else {
        foods = this.selectSnack(usedFoodsThisWeek, usedFoodsToday);
      }
      
      foods = foods.filter(f => !this.ALIMENTOS_NO_APROPIADOS.some(noApto => f.name.toLowerCase().includes(noApto)));
      foods = foods.filter(f => !input.allergies.some(a => f.name.toLowerCase().includes(a.toLowerCase())));
      
      foods = foods.map((f: FoodItem) => this._ajustarPorcionInteligente(f, targetCalories / foods.length));
      foods = foods.map(f => this._roundFoodValues(f));
      
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
    
    let adjustedMeals = this.adjustPortionsToMeetCalories(meals, input.daily_calories);
    adjustedMeals = this.validateMinimumCaloriesPerMeal(adjustedMeals, input.daily_calories, mealDist);
    
    return adjustedMeals;
  }

  private pickRandom<T>(array: T[], usedSet: Set<string>): T | null {
    const available = array.filter((item: any) => !usedSet.has(item.name.toLowerCase()));
    if (available.length === 0) return array[Math.floor(Math.random() * array.length)];
    return available[Math.floor(Math.random() * available.length)];
  }

  private markUsed(item: CuratedFood, usedSet: Set<string>) {
    usedSet.add(item.name.toLowerCase());
  }

  private toFoodItem(item: CuratedFood): FoodItem {
    return {
      food_id: `curated_${item.name.replace(/\s+/g, '_').toLowerCase()}`,
      name: item.name,
      brand: '',
      serving_size: item.serving_size,
      serving_unit: item.unit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber
    };
  }

  private selectDesayuno(usedWeek: Set<string>, usedDay: Set<string>): FoodItem[] {
    const result: FoodItem[] = [];
    const carb = this.pickRandom(this.CURATED_CATALOG['desayuno_carbs'], usedWeek);
    const protein = this.pickRandom(this.CURATED_CATALOG['desayuno_proteins'], usedWeek);
    
    if (carb) { this.markUsed(carb, usedWeek); this.markUsed(carb, usedDay); result.push(this.toFoodItem(carb)); }
    if (protein) { this.markUsed(protein, usedWeek); this.markUsed(protein, usedDay); result.push(this.toFoodItem(protein)); }
    
    return result;
  }

  private selectAlmuerzoCena(usedWeek: Set<string>, usedDay: Set<string>): FoodItem[] {
    const result: FoodItem[] = [];
    const protein = this.pickRandom(this.CURATED_CATALOG['almuerzo_proteins'], usedWeek);
    const carb = this.pickRandom(this.CURATED_CATALOG['almuerzo_carbs'], usedWeek);
    const veggie = this.pickRandom(this.CURATED_CATALOG['almuerzo_veggies'], usedWeek);
    
    if (protein) { this.markUsed(protein, usedWeek); this.markUsed(protein, usedDay); result.push(this.toFoodItem(protein)); }
    if (carb) { this.markUsed(carb, usedWeek); this.markUsed(carb, usedDay); result.push(this.toFoodItem(carb)); }
    if (veggie) { this.markUsed(veggie, usedWeek); this.markUsed(veggie, usedDay); result.push(this.toFoodItem(veggie)); }
    
    return result;
  }

  private selectSnack(usedWeek: Set<string>, usedDay: Set<string>): FoodItem[] {
    const result: FoodItem[] = [];
    const fruit = this.pickRandom(this.CURATED_CATALOG['snack_fruits'], usedWeek);
    const extra = this.pickRandom(this.CURATED_CATALOG['snack_extras'], usedWeek);
    
    if (fruit) { this.markUsed(fruit, usedWeek); this.markUsed(fruit, usedDay); result.push(this.toFoodItem(fruit)); }
    if (extra) { this.markUsed(extra, usedWeek); this.markUsed(extra, usedDay); result.push(this.toFoodItem(extra)); }
    
    return result;
  }

  private _ajustarPorcionInteligente(food: FoodItem, targetCalories: number): FoodItem {
    const esUnidad = food.serving_unit === 'unidad' || food.serving_unit === 'rebanada';
    
    if (esUnidad) {
      const caloriasPorUnidad = food.calories / food.serving_size;
      let unidadesNecesarias = targetCalories / caloriasPorUnidad;
      unidadesNecesarias = Math.max(1, Math.min(3, Math.round(unidadesNecesarias)));
      
      return {
        ...food,
        serving_size: unidadesNecesarias,
        calories: this._round(caloriasPorUnidad * unidadesNecesarias),
        protein: this._round((food.protein / food.serving_size) * unidadesNecesarias),
        carbs: this._round((food.carbs / food.serving_size) * unidadesNecesarias),
        fat: this._round((food.fat / food.serving_size) * unidadesNecesarias),
        fiber: food.fiber ? this._round((food.fiber / food.serving_size) * unidadesNecesarias) : 0
      };
    }
    
    const caloriasPorGramo = food.calories / food.serving_size;
    let porcionIdeal = targetCalories / caloriasPorGramo;
    
    const MAX_GRAMOS = food.name.toLowerCase().includes('ensalada') || food.name.toLowerCase().includes('espinaca') ? 300 : 250;
    porcionIdeal = Math.max(30, Math.min(MAX_GRAMOS, porcionIdeal));
    
    const factor = porcionIdeal / food.serving_size;
    
    return {
      ...food,
      serving_size: Math.round(porcionIdeal),
      serving_unit: 'g',
      calories: this._round(food.calories * factor),
      protein: this._round(food.protein * factor),
      carbs: this._round(food.carbs * factor),
      fat: this._round(food.fat * factor),
      fiber: food.fiber ? this._round(food.fiber * factor) : 0
    };
  }

  private _roundFoodValues(food: FoodItem): FoodItem {
    return {
      ...food,
      calories: this._round(food.calories),
      protein: this._round(food.protein),
      carbs: this._round(food.carbs),
      fat: this._round(food.fat),
      fiber: food.fiber ? this._round(food.fiber) : undefined
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
    const goals: Record<ActivityLevel, number> = { sedentario: 2.0, ligera: 2.5, moderada: 3.0, intensa: 3.5 };
    return goals[activity] || 2.5;
  }

  private getDailyNotes(profile: string, dayIndex: number): string {
    if (profile === 'Control Glucemico') {
      const notes = [
        'Monitorear glucosa 2h post-almuerzo',
        'Evitar picos de carbohidratos en la tarde',
        'Incluir fibra en cada comida',
        'Recordar hidratación constante',
        'Cena ligera',
        'Revisar síntomas de hipoglucemia',
        'Planificar snacks de emergencia'
      ];
      return notes[dayIndex % notes.length];
    }
    return '';
  }

  private getMealNotes(mealType: MealType, profile: string, _dayName: string): string {
    if (profile === 'Control Glucemico') {
      if (mealType === 'desayuno') return 'Incluir proteína para estabilizar glucosa matutina';
      if (mealType === 'cena') return 'Cena ligera, al menos 3h antes de dormir';
      return 'Combinar carbohidratos con proteína/fibra';
    }
    return '';
  }

  private getFoodsToAvoid(profile: string, allergies: string[]): string[] {
    const baseAvoid: Record<string, string[]> = {
      'Control Glucemico': ['azúcar refinada', 'jugos industriales', 'pan blanco'],
      'Hipocalorico': ['fritos', 'salsas cremosas', 'bebidas azucaradas'],
      'Hipo-grasa': ['manteca', 'embutidos', 'frituras']
    };
    return [...(baseAvoid[profile] || []), ...allergies];
  }

  private getWeeklyFocusAreas(profile: string): string[] {
    const focuses: Record<string, string[]> = {
      'Normocalorico': ['Mantener horarios regulares', 'Variedad de vegetales', 'Hidratación'],
      'Control Glucemico': ['Monitoreo glucémico', 'Carbohidratos de bajo IG', 'Fibra en cada comida'],
      'Hipocalorico': ['Saciedad con baja densidad', 'Actividad física', 'Mindful eating'],
      'Hipo-grasa': ['Grasas saludables', 'Cocción al vapor/horno', 'Lectura de etiquetas']
    };
    return focuses[profile] || focuses['Normocalorico'];
  }

  private generateMonthlySummary(week1: WeekPlan): GeneratedNutritionPlan['plan']['monthly_summary'] {
    return {
      total_days: 28,
      avg_calories: week1.weekly_goals.avg_daily_calories,
      adherence_tips: ['Preparar comidas con anticipación', 'Mantener diario de alimentación', 'Revisar progreso semana 2 y 4', 'Ajustar porciones según saciedad'],
      progress_checkpoints: [
        { week: 1, goal: 'Adaptación a nuevos horarios' },
        { week: 2, goal: 'Evaluación de saciedad' },
        { week: 3, goal: 'Ajuste de porciones' },
        { week: 4, goal: 'Planificación de mantenimiento' }
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
      objetivos: plan.recommendations?.additional_notes ? [plan.recommendations.main, plan.recommendations.additional_notes] : [plan.recommendations.main],
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
      return await firstValueFrom(
        this.http.post<PlanSaveResponse>(this.API_URL, payload, {
          headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` })
        })
      );
    } catch (error: any) {
      console.error('Error guardando plan:', error);
      return { error: true, mensaje: error.error?.mensaje || 'Error al guardar el plan' };
    }
  }

  async updatePlanDetail(planId: string, planDetallado: GeneratedNutritionPlan['plan']): Promise<PlanSaveResponse> {
    const token = localStorage.getItem('token');
    try {
      return await firstValueFrom(
        this.http.put<PlanSaveResponse>(`${this.API_URL}/${planId}/detallado`, { plan_detallado: planDetallado }, {
          headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` })
        })
      );
    } catch (error: any) {
      console.error('Error actualizando plan:', error);
      return { error: true, mensaje: error.error?.mensaje || 'Error al actualizar' };
    }
  }

  private adjustPortionsToMeetCalories(meals: MealPlan[], targetDailyCalories: number): MealPlan[] {
    const currentTotal = meals.reduce((sum, meal) => sum + meal.total_calories, 0);
    const deficit = targetDailyCalories - currentTotal;
    
    if (Math.abs(deficit) <= targetDailyCalories * 0.05) return meals;
    
    const factor = targetDailyCalories / currentTotal;
    const limitedFactor = Math.max(0.8, Math.min(1.3, factor));
    
    meals.forEach(meal => {
      meal.foods.forEach(food => {
        if (food.serving_unit === 'unidad' || food.serving_unit === 'rebanada') return;
        
        const newServing = food.serving_size * limitedFactor;
        const scale = newServing / food.serving_size;
        
        food.serving_size = Math.round(newServing);
        food.calories = this._round(food.calories * scale);
        food.protein = this._round(food.protein * scale);
        food.carbs = this._round(food.carbs * scale);
        food.fat = this._round(food.fat * scale);
        if (food.fiber) food.fiber = this._round(food.fiber * scale);
      });
      
      const mealTotals = meal.foods.reduce((acc: any, food: FoodItem) => ({
        calories: acc.calories + food.calories,
        protein: acc.protein + food.protein,
        carbs: acc.carbs + food.carbs,
        fat: acc.fat + food.fat
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
      
      meal.total_calories = this._round(mealTotals.calories);
      meal.total_protein = this._round(mealTotals.protein);
      meal.total_carbs = this._round(mealTotals.carbs);
      meal.total_fat = this._round(mealTotals.fat);
    });
    
    return meals;
  }

  private validateMinimumCaloriesPerMeal(meals: MealPlan[], dailyCalories: number, mealDist: Record<MealType, number>): MealPlan[] {
    meals.forEach(meal => {
      const targetCalories = dailyCalories * mealDist[meal.meal_type];
      const minCalories = targetCalories * 0.7;
      
      if (meal.total_calories < minCalories) {
        const factor = targetCalories / meal.total_calories;
        const limitedFactor = Math.min(1.5, factor);
        
        meal.foods.forEach(food => {
          if (food.serving_unit === 'unidad' || food.serving_unit === 'rebanada') return;
          
          const newServing = food.serving_size * limitedFactor;
          const scale = newServing / food.serving_size;
          
          food.serving_size = Math.round(newServing);
          food.calories = this._round(food.calories * scale);
          food.protein = this._round(food.protein * scale);
          food.carbs = this._round(food.carbs * scale);
          food.fat = this._round(food.fat * scale);
          if (food.fiber) food.fiber = this._round(food.fiber * scale);
        });
        
        const mealTotals = meal.foods.reduce((acc: any, food: FoodItem) => ({
          calories: acc.calories + food.calories,
          protein: acc.protein + food.protein,
          carbs: acc.carbs + food.carbs,
          fat: acc.fat + food.fat
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        
        meal.total_calories = this._round(mealTotals.calories);
        meal.total_protein = this._round(mealTotals.protein);
        meal.total_carbs = this._round(mealTotals.carbs);
        meal.total_fat = this._round(mealTotals.fat);
      }
    });
    return meals;
  }
}