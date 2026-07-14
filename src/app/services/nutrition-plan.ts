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
  
  // URL de tu base de datos de alimentos en el backend
  // NOTA: Si el archivo está en la carpeta 'assets' de Angular en lugar del backend, 
  // cambia esto a: '/assets/data/food_db.json'
  private readonly FOOD_DB_URL = `${environment.apiUrl.replace(/\/$/, '')}/nutricionapp-api/data/food_db.json`;

  private readonly ALIMENTOS_NO_APROPIADOS = [
    'especia', 'fenogreco', 'galleta', 'cookie', 'spice', 'seasoning',
    'candy', 'dulce', 'soda', 'refresco', 'alcohol', 'beer', 'wine',
    'aceite', 'manteca', 'grasa', 'sugar', 'azúcar', 'salt', 'sal',
    'extract', 'extracto', 'flavoring', 'saborizante', 'coloring',
    'supplement', 'suplemento', 'powder', 'polvo', 'concentrate'
  ];

  private foodDatabase: FoodItem[] = [];
  private isDbLoaded = false;
  private categorizedFoods: Record<string, FoodItem[]> | null = null;

  constructor(
    private http: HttpClient,
    private fatsecretApi: FatsecretApiService
  ) {}

  private async ensureFoodDatabaseLoaded(): Promise<void> {
    if (this.isDbLoaded && this.foodDatabase.length > 0) {
      return;
    }
    try {
      console.log('Cargando base de datos de alimentos desde el backend...');
      const data: any[] = await firstValueFrom(this.http.get<any[]>(this.FOOD_DB_URL));
      this.foodDatabase = data.map(item => this.mapToFoodItem(item));
      this.isDbLoaded = true;
      this.categorizedFoods = null; // Resetear categorización para forzar recálculo
      console.log('Base de datos de alimentos cargada exitosamente:', this.foodDatabase.length, 'alimentos');
    } catch (error) {
      console.error('Error cargando la base de datos de alimentos:', error);
      this.foodDatabase = this.getFallbackFoods();
      this.isDbLoaded = true;
      this.categorizedFoods = null;
    }
  }

  private mapToFoodItem(item: any): FoodItem {
    if (item.food_id && item.name) {
      return item as FoodItem;
    }
    
    const name = item.description || 'Alimento desconocido';
    const nutrients = item.foodNutrients || [];
    
    const getNutrient = (nutrientName: string) => {
      const n = nutrients.find((nut: any) => 
        nut.nutrient && nut.nutrient.name && nut.nutrient.name.toLowerCase().includes(nutrientName.toLowerCase())
      );
      return n ? (n.amount || 0) : 0;
    };

    const calories = getNutrient('Energy');
    const protein = getNutrient('Protein');
    const carbs = getNutrient('Carbohydrate');
    const fat = getNutrient('lipid') || getNutrient('fat');
    const fiber = getNutrient('Fiber');

    return {
      food_id: item.fdcId || item.food_id || Math.random().toString(36).substr(2, 9),
      name: this._translateFoodName(name),
      brand: item.brand || '',
      serving_size: 100,
      serving_unit: 'g',
      calories: Math.round(calories * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10
    };
  }

  private getFallbackFoods(): FoodItem[] {
    return [
      { food_id: 'fb_1', name: 'Pechuga de pollo', serving_size: 100, serving_unit: 'g', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
      { food_id: 'fb_2', name: 'Arroz integral', serving_size: 100, serving_unit: 'g', calories: 112, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8 },
      { food_id: 'fb_3', name: 'Brócoli', serving_size: 100, serving_unit: 'g', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
      { food_id: 'fb_4', name: 'Manzana', serving_size: 100, serving_unit: 'g', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 },
      { food_id: 'fb_5', name: 'Almendras', serving_size: 30, serving_unit: 'g', calories: 170, protein: 6, carbs: 6, fat: 15, fiber: 3.5 }
    ];
  }

  private getCategorizedFoods(): Record<string, FoodItem[]> {
    if (this.categorizedFoods) return this.categorizedFoods;

    const categories: Record<string, FoodItem[]> = {
      proteinas: [],
      carbohidratos: [],
      verduras: [],
      frutas: [],
      snacks: []
    };

    for (const food of this.foodDatabase) {
      if (!this._esAlimentoApropiado(food)) continue;
      const name = food.name.toLowerCase();
      
      if (name.match(/pollo|pavo|res|cerdo|pescado|salmón|atún|tofu|lentejas|frijol|huevo|garbanzo/)) {
        categories['proteinas'].push(food);
      } else if (name.match(/arroz|quinoa|avena|papa|camote|pan|pasta|tortilla/)) {
        categories['carbohidratos'].push(food);
      } else if (name.match(/brócoli|espinaca|zanahoria|pepino|lechuga|calabacín|ejote|coliflor|pimiento/)) {
        categories['verduras'].push(food);
      } else if (name.match(/manzana|pera|fresa|arándano|plátano|naranja|kiwi|melón|uva/)) {
        categories['frutas'].push(food);
      } else if (name.match(/almendra|nuez|yogur|cottage|semilla|palta|aguacate/)) {
        categories['snacks'].push(food);
      }
    }
    
    this.categorizedFoods = categories;
    return categories;
  }

  async generatePlan(input: PlanGenerationInput): Promise<GeneratedNutritionPlan> {
    const perfilesValidos = [
      'Normocalorico', 
      'Control Glucemico', 
      'Hipocalorico', 
      'Hipo-grasa'
    ] as const;
    
    const perfilOriginal = input.profile_type;
    const perfilNormalizado = perfilOriginal
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    
    const perfilEncontrado = perfilesValidos.find(p => 
      p.normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .toLowerCase() === perfilNormalizado
    ) || 'Normocalorico';
    
    console.log('Perfil original:', perfilOriginal);
    console.log('Perfil normalizado:', perfilNormalizado);
    console.log('Perfil mapeado:', perfilEncontrado);
    
    input.profile_type = perfilEncontrado;
    
    const needsGlycemicControl = this._needsGlycemicControl(input);
    const profileType = needsGlycemicControl ? 'Control Glucemico' as const : perfilEncontrado;
    
    console.log('needsGlycemicControl:', needsGlycemicControl);
    console.log('profileType final:', profileType);
    console.log('Macros:', this._getMacrosForProfile(profileType));
    
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
    const perfilNormalizado = input.profile_type
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    if (perfilNormalizado === 'Control Glucemico') return true;
    
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
    await this.ensureFoodDatabaseLoaded();
    
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
    needsGlycemicControl: boolean,
    usedFoodsThisWeek: Set<string>
  ): Promise<MealPlan[]> {
    const categories = this.getCategorizedFoods();
    const meals: MealPlan[] = [];
    const mealOrder: MealType[] = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena', 'colacion'];
    const usedFoodsToday = new Set<string>();
    
    for (const mealType of mealOrder) {
      if (mealDist[mealType] === 0) continue;
      
      const targetCalories = Math.round(input.daily_calories * mealDist[mealType]);
      
      let foods = this.selectFoodsForMealFromDB(
        mealType, 
        needsGlycemicControl, 
        categories,
        usedFoodsThisWeek, 
        usedFoodsToday, 
        input.allergies
      );
      
      foods = foods.map((f: FoodItem) => {
        const adjusted = this._ajustarPorcionInteligente(f, targetCalories / (foods.length || 1));
        return this._roundFoodValues(adjusted);
      });
      
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

  private selectFoodsForMealFromDB(
    mealType: MealType,
    needsGlycemicControl: boolean,
    categories: Record<string, FoodItem[]>,
    usedFoodsThisWeek: Set<string>,
    usedFoodsToday: Set<string>,
    allergies: string[]
  ): FoodItem[] {
    const selected: FoodItem[] = [];
    
    const pickFromCategory = (category: string, excludeKeywords: string[] = []) => {
      const pool = categories[category].filter(f => 
        !allergies.some(a => f.name.toLowerCase().includes(a.toLowerCase())) &&
        !excludeKeywords.some(k => f.name.toLowerCase().includes(k))
      );
      
      let available = pool.filter(f => 
        !usedFoodsThisWeek.has(f.name.toLowerCase().trim()) && 
        !usedFoodsToday.has(f.name.toLowerCase().trim())
      );
      
      if (available.length === 0) {
        available = pool.filter(f => !usedFoodsToday.has(f.name.toLowerCase().trim()));
      }
      
      if (available.length === 0) {
        available = pool;
      }
      
      const shuffled = this._shuffleArray(available);
      const picked = shuffled[0];
      
      if (picked) {
        usedFoodsThisWeek.add(picked.name.toLowerCase().trim());
        usedFoodsToday.add(picked.name.toLowerCase().trim());
      }
      return picked;
    };

    if (mealType === 'almuerzo' || mealType === 'cena') {
      const protein = pickFromCategory('proteinas');
      const carb = pickFromCategory('carbohidratos');
      const veggie = pickFromCategory('verduras');
      
      if (protein) selected.push(protein);
      if (carb) selected.push(carb);
      if (veggie) selected.push(veggie);
    } 
    else if (mealType === 'desayuno') {
      const carb = pickFromCategory('carbohidratos', ['arroz', 'papa', 'pasta']);
      const proteinOrFruit = Math.random() > 0.5 ? pickFromCategory('proteinas') : pickFromCategory('frutas');
      
      if (carb) selected.push(carb);
      if (proteinOrFruit) selected.push(proteinOrFruit);
    } 
    else {
      const snack1 = pickFromCategory('snacks');
      const snack2 = Math.random() > 0.6 ? pickFromCategory('frutas') : null;
      
      if (snack1) selected.push(snack1);
      if (snack2) selected.push(snack2);
    }
    
    return selected.filter(Boolean) as FoodItem[];
  }

  private _shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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

  private validateFoodMacros(food: FoodItem): FoodItem {
    const nameLower = food.name.toLowerCase();
    const servingSize = food.serving_size || 100;
    const multiplier = servingSize / 100;
    
    let maxProteinPer100g = 50;
    let maxCarbsPer100g = 100;
    let maxFatPer100g = 100;
    
    if (nameLower.match(/fresa|manzana|pera|banana|plátano|naranja|uva|kiwi|sandía|melón|durazno|mango|piña|arándano|fruit|berry|apple|pear|orange/)) {
      maxProteinPer100g = 2;
      maxCarbsPer100g = 25;
      maxFatPer100g = 1;
    }
    else if (nameLower.match(/brócoli|broccoli|espinaca|zanahoria|pepino|tomate|lechuga|verdura|vegetable|spinach|carrot|cucumber/)) {
      maxProteinPer100g = 5;
      maxCarbsPer100g = 12;
      maxFatPer100g = 1;
    }
    
    const maxProtein = maxProteinPer100g * multiplier;
    const maxCarbs = maxCarbsPer100g * multiplier;
    const maxFat = maxFatPer100g * multiplier;
    
    if (food.protein > maxProtein || food.carbs > maxCarbs || food.fat > maxFat) {
      console.warn(
        `[VALIDACIÓN] Macros imposibles detectados: ${food.name}`,
        `\n   Proteína: ${food.protein}g (máx: ${maxProtein}g)`,
        `\n   Carbs: ${food.carbs}g (máx: ${maxCarbs}g)`,
        `\n   Grasa: ${food.fat}g (máx: ${maxFat}g)`
      );
      
      const correctedProtein = Math.min(food.protein, maxProtein);
      const correctedCarbs = Math.min(food.carbs, maxCarbs);
      const correctedFat = Math.min(food.fat, maxFat);
      
      const recalculatedCalories = 
        (correctedProtein * 4) + 
        (correctedCarbs * 4) + 
        (correctedFat * 9);
      
      return {
        ...food,
        protein: this._round(correctedProtein),
        carbs: this._round(correctedCarbs),
        fat: this._round(correctedFat),
        calories: this._round(recalculatedCalories)
      };
    }
    
    return food;
  }

  private _ajustarPorcionInteligente(food: FoodItem, targetCalories: number): FoodItem {
    const nameLower = food.name.toLowerCase();
    
    const esHuevo = nameLower.includes('huevo') || nameLower.includes('egg');
    const esUnidad = food.serving_unit?.toLowerCase() === 'unidad' || 
                     food.serving_unit?.toLowerCase() === 'unit' ||
                     esHuevo;
    
    if (esHuevo || esUnidad) {
      const CALORIAS_POR_HUEVO = 78;
      const MAX_HUEVOS = 3;
      
      let unidadesNecesarias = targetCalories / CALORIAS_POR_HUEVO;
      unidadesNecesarias = Math.min(unidadesNecesarias, MAX_HUEVOS);
      unidadesNecesarias = Math.max(1, Math.round(unidadesNecesarias));
      
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
      'chicken breast': 'Pechuga de pollo',
      'chicken': 'Pollo',
      'turkey': 'Pavo',
      'beef': 'Res',
      'pork': 'Cerdo',
      'fish, white': 'Pescado blanco',
      'salmon': 'Salmón',
      'tuna': 'Atún',
      'tofu': 'Tofu',
      'lentils': 'Lentejas',
      'egg': 'Huevo',
      'rice': 'Arroz',
      'quinoa': 'Quinoa',
      'oatmeal': 'Avena',
      'bread': 'Pan',
      'pasta': 'Pasta',
      'milk': 'Leche',
      'yogurt': 'Yogur',
      'greek yogurt': 'Yogur griego',
      'cheese': 'Queso',
      'broccoli': 'Brócoli',
      'carrot': 'Zanahoria',
      'spinach': 'Espinacas',
      'cucumber': 'Pepino',
      'apple': 'Manzana',
      'banana': 'Banana',
      'pear': 'Pera',
      'strawberry': 'Fresa',
      'almonds': 'Almendras',
      'walnuts': 'Nueces',
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
      adherence_tips: [
        'Preparar comidas con anticipación',
        'Mantener diario de alimentación',
        'Revisar progreso semana 2 y 4',
        'Ajustar porciones según saciedad'
      ],
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
      console.error('Error actualizando plan:', error);
      return { error: true, mensaje: error.error?.mensaje || 'Error al actualizar' };
    }
  }

  private adjustPortionsToMeetCalories(
    meals: MealPlan[], 
    targetDailyCalories: number
  ): MealPlan[] {
    const currentTotal = meals.reduce((sum, meal) => sum + meal.total_calories, 0);
    const deficit = targetDailyCalories - currentTotal;
    
    if (Math.abs(deficit) <= targetDailyCalories * 0.05) {
      return meals;
    }
    
    console.log(`[AJUSTE] Déficit calórico: ${deficit.toFixed(0)} kcal (${currentTotal.toFixed(0)} -> ${targetDailyCalories})`);
    
    const factor = targetDailyCalories / currentTotal;
    const limitedFactor = Math.max(0.8, Math.min(1.4, factor));
    
    meals.forEach(meal => {
      meal.foods.forEach(food => {
        if (food.serving_unit === 'unidad' || food.serving_unit === 'rebanada') {
          return;
        }
        
        const newServing = food.serving_size * limitedFactor;
        const scale = newServing / food.serving_size;
        
        food.serving_size = this._round(newServing);
        food.calories = this._round(food.calories * scale);
        food.protein = this._round(food.protein * scale);
        food.carbs = this._round(food.carbs * scale);
        food.fat = this._round(food.fat * scale);
        if (food.fiber) {
          food.fiber = this._round(food.fiber * scale);
        }
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
    
    const newTotal = meals.reduce((sum, meal) => sum + meal.total_calories, 0);
    console.log(`[AJUSTE] Nuevo total: ${newTotal.toFixed(0)} kcal`);
    
    return meals;
  }

  private validateMinimumCaloriesPerMeal(
    meals: MealPlan[], 
    dailyCalories: number,
    mealDist: Record<MealType, number>
  ): MealPlan[] {
    
    meals.forEach(meal => {
      const targetCalories = dailyCalories * mealDist[meal.meal_type];
      const minCalories = targetCalories * 0.7;
      
      if (meal.total_calories < minCalories) {
        console.warn(
          `[VALIDACIÓN] ${meal.meal_type} tiene solo ${meal.total_calories.toFixed(0)} kcal ` +
          `(mínimo esperado: ${minCalories.toFixed(0)} kcal)`
        );
        
        const factor = targetCalories / meal.total_calories;
        const limitedFactor = Math.min(2.0, factor);
        
        meal.foods.forEach(food => {
          if (food.serving_unit === 'unidad' || food.serving_unit === 'rebanada') {
            return;
          }
          
          const newServing = food.serving_size * limitedFactor;
          const scale = newServing / food.serving_size;
          
          food.serving_size = this._round(newServing);
          food.calories = this._round(food.calories * scale);
          food.protein = this._round(food.protein * scale);
          food.carbs = this._round(food.carbs * scale);
          food.fat = this._round(food.fat * scale);
          if (food.fiber) {
            food.fiber = this._round(food.fiber * scale);
          }
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
        
        console.log(`[VALIDACIÓN] ${meal.meal_type} ajustado a ${meal.total_calories.toFixed(0)} kcal`);
      }
    });
    
    return meals;
  }
}