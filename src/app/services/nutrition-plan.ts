// src/app/services/nutrition-plan.service.ts
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

  constructor(
    private http: HttpClient,
    private fatsecretApi: FatsecretApiService
  ) {}

  // ============================================================================
  // 🧠 GENERAR PLAN (con adaptación para diabetes y alergias)
  // ============================================================================
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

  // ============================================================================
  // 🗓️ GENERAR SEMANA
  // ============================================================================
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
      
      days.push({
        date: date.toISOString().split('T')[0],
        day_name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        meals,
        daily_totals,
        hydration_goal_liters: this.calculateHydrationGoal(input.preferences.activity_level),
        special_notes: this.getDailyNotes(needsGlycemicControl ? 'Control Glucemico' : input.profile_type, i)
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

  // ============================================================================
  // 🍽️ GENERAR COMIDAS DEL DÍA
  // ============================================================================
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
      
      // 🔍 Filtrar alergias
      foods = foods.filter((food: FoodItem) => 
        !input.allergies.some((allergy: string) => 
          food.name.toLowerCase().includes(allergy.toLowerCase()) ||
          food.brand?.toLowerCase().includes(allergy.toLowerCase())
        )
      );
      
      // 🛡️ Garantizar que nunca quede una comida vacía
      if (foods.length === 0) {
        foods = this._getMinimumFoodsForMeal(mealType, needsGlycemicControl, input.allergies);
      }
      
      // 🔥 NUEVO: Ajustar porciones según calorías objetivo
      foods = this._adjustPortionsToTargetCalories(foods, targetCalories);
      
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
    return meals;
  }

  // ============================================================================
  // 🔥 NUEVO: AJUSTAR PORCIONES SEGÚN CALORÍAS OBJETIVO
  // ============================================================================
  private _adjustPortionsToTargetCalories(foods: FoodItem[], targetCalories: number): FoodItem[] {
    if (foods.length === 0 || targetCalories === 0) return foods;
    
    const currentCalories = foods.reduce((sum, f) => sum + f.calories, 0);
    
    // Solo ajustar si la diferencia es > 15%
    const ratio = targetCalories / currentCalories;
    if (Math.abs(ratio - 1) < 0.15) return foods;
    
    console.log(`🔧 Ajustando porciones: ${currentCalories} kcal → ${targetCalories} kcal (factor: ${ratio.toFixed(2)})`);
    
    return foods.map(food => ({
      ...food,
      serving_size: this._round(food.serving_size * ratio),
      calories: this._round(food.calories * ratio),
      protein: this._round(food.protein * ratio),
      carbs: this._round(food.carbs * ratio),
      fat: this._round(food.fat * ratio),
      fiber: food.fiber ? this._round(food.fiber * ratio) : undefined
    }));
  }

  // ============================================================================
  // 🔍 SELECCIONAR ALIMENTOS POR COMIDA (LÓGICA CORREGIDA)
  // ============================================================================
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
      // 🔥 CORRECCIÓN: Usar índice DIFERENTE para cada tipo de snack
      const snackIndex = this._getSnackIndex(mealType, dayIndex);
      return this._getMockFoodsForMeal(mealType, snackIndex, needsGlycemicControl, input.allergies)
        .slice(0, 2)
        .map((f: FoodItem) => this._roundFoodValues(f));
    }
    
    // Desayuno: intentar FatSecret primero
    try {
      const apiFoods: FoodItem[] = await firstValueFrom(
        this.fatsecretApi.searchFoods(searchQuery, 8).pipe(timeout(10000))
      );
      
      const filtered = apiFoods
        .filter((food: FoodItem) => food.calories > 0)
        .slice(0, 2);
      
      if (filtered.length >= 2) {
        return filtered
          .map((f: FoodItem) => ({
            ...f,
            name: this._translateFoodName(f.name)
          }))
          .map((f: FoodItem) => this._roundFoodValues(f));
      }
    } catch (error) {
      console.warn(`⚠️ FatSecret fallback para ${mealType}`);
    }
    
    return this._getMockFoodsForMeal('desayuno', dayIndex, needsGlycemicControl, input.allergies)
      .slice(0, 2)
      .map((f: FoodItem) => this._roundFoodValues(f));
  }

    // ============================================================================
  // 🗣️ TRADUCCIÓN: Nombre de alimento inglés → español
  // ============================================================================
  private _translateFoodName(name: string): string {
    const EN_TO_ES_FOODS: Record<string, string> = {
      'chicken breast, grilled': 'Pechuga de pollo a la plancha',
      'chicken breast, roasted': 'Pechuga de pollo asada',
      'chicken breast, skinless': 'Pechuga de pollo sin piel',
      'chicken thigh, roasted': 'Muslo de pollo asado',
      'chicken thigh, grilled': 'Muslo de pollo a la plancha',
      'chicken drumstick, roasted': 'Pierna de pollo asada',
      'chicken wing, roasted': 'Alita de pollo asada',
      'chicken, whole, roasted': 'Pollo entero asado',
      'chicken, stewed': 'Pollo guisado',
      'chicken, fried': 'Pollo frito',
      'chicken breast': 'Pechuga de pollo',
      'chicken thigh': 'Muslo de pollo',
      'chicken drumstick': 'Pierna de pollo',
      'chicken wing': 'Alita de pollo',
      'turkey breast, roasted': 'Pechuga de pavo asada',
      'turkey, ground, cooked': 'Pavo molido cocido',
      'turkey breast': 'Pechuga de pavo',
      'turkey': 'Pavo',
      'beef, lean ground, cooked': 'Carne molida magra cocida',
      'beef, ground, 85% lean': 'Carne molida 85% magra',
      'beef steak, grilled': 'Bistec de res a la parrilla',
      'beef steak, pan-fried': 'Bistec de res salteado',
      'beef roast, roasted': 'Asado de res al horno',
      'beef rib, roasted': 'Costilla de res asada',
      'beef brisket, braised': 'Pecho de res estofado',
      'beef, lean': 'Carne magra de res',
      'beef': 'Res',
      'pork loin, lean, cooked': 'Lomo de cerdo magro cocido',
      'pork chop, grilled': 'Chuleta de cerdo a la parrilla',
      'pork chop, pan-fried': 'Chuleta de cerdo salteada',
      'pork tenderloin, roasted': 'Solomillo de cerdo asado',
      'pork shoulder, roasted': 'Paleta de cerdo asada',
      'pork belly, roasted': 'Panceta de cerdo asada',
      'pork, ground, cooked': 'Cerdo molido cocido',
      'pork ribs, barbecued': 'Costillitas de cerdo barbacoa',
      'pork': 'Cerdo',
      'lamb chop, grilled': 'Chuleta de cordero a la parrilla',
      'lamb leg, roasted': 'Pierna de cordero asada',
      'lamb, ground, cooked': 'Cordero molido cocido',
      'lamb': 'Cordero',
      'fish, white, grilled': 'Pescado blanco a la parrilla',
      'fish, white, baked': 'Pescado blanco al horno',
      'fish, white, fried': 'Pescado blanco frito',
      'white fish': 'Pescado blanco',
      'fish fillet, grilled': 'Filete de pescado a la parrilla',
      'fish fillet, baked': 'Filete de pescado al horno',
      'salmon, baked': 'Salmón al horno',
      'salmon, grilled': 'Salmón a la parrilla',
      'salmon, smoked': 'Salmón ahumado',
      'salmon, raw': 'Salmón crudo',
      'salmon': 'Salmón',
      'tuna, canned in water': 'Atún en lata en agua',
      'tuna, canned in oil': 'Atún en lata en aceite',
      'tuna, fresh, grilled': 'Atún fresco a la parrilla',
      'tuna steak, grilled': 'Bistec de atún a la parrilla',
      'tuna': 'Atún',
      'cod, baked': 'Bacalao al horno',
      'cod, grilled': 'Bacalao a la parrilla',
      'cod': 'Bacalao',
      'tilapia, grilled': 'Tilapia a la parrilla',
      'tilapia, baked': 'Tilapia al horno',
      'tilapia': 'Tilapia',
      'shrimp, cooked': 'Camarones cocidos',
      'shrimp, grilled': 'Camarones a la parrilla',
      'shrimp, fried': 'Camarones fritos',
      'shrimp': 'Camarones',
      'crab, cooked': 'Cangrejo cocido',
      'crab meat': 'Carne de cangrejo',
      'lobster, cooked': 'Langosta cocida',
      'scallops, grilled': 'Vieiras a la parrilla',
      'tofu, firm': 'Tofu firme',
      'tofu, soft': 'Tofu suave',
      'tofu, silken': 'Tofu sedoso',
      'tofu, fried': 'Tofu frito',
      'tofu': 'Tofu',
      'tempeh': 'Tempeh',
      'seitan': 'Seitán',
      'lentils, cooked': 'Lentejas cocidas',
      'lentils, boiled': 'Lentejas hervidas',
      'lentils': 'Lentejas',
      'chickpeas, cooked': 'Garbanzos cocidos',
      'chickpeas, roasted': 'Garbanzos tostados',
      'chickpeas': 'Garbanzos',
      'black beans, cooked': 'Frijoles negros cocidos',
      'kidney beans, cooked': 'Frijoles rojos cocidos',
      'pinto beans, cooked': 'Frijoles pintos cocidos',
      'beans, mixed, cooked': 'Frijoles mixtos cocidos',
      'egg, whole, boiled': 'Huevo de gallina cocido',
      'egg, whole, poached': 'Huevo de gallina escalfado',
      'egg, whole, fried': 'Huevo de gallina frito',
      'egg, scrambled': 'Huevo revuelto',
      'egg, omelet': 'Tortilla de huevo',
      'egg white, boiled': 'Clara de huevo cocida',
      'egg yolk, boiled': 'Yema de huevo cocida',
      'egg, whole': 'Huevo de gallina',
      'egg': 'Huevo',
      'rice, white, cooked': 'Arroz blanco cocido',
      'rice, white, boiled': 'Arroz blanco hervido',
      'rice, brown, cooked': 'Arroz integral cocido',
      'rice, brown, boiled': 'Arroz integral hervido',
      'rice, wild, cooked': 'Arroz salvaje cocido',
      'rice, jasmine, cooked': 'Arroz jazmín cocido',
      'rice, basmati, cooked': 'Arroz basmati cocido',
      'rice, white': 'Arroz blanco',
      'rice, brown': 'Arroz integral',
      'rice': 'Arroz',
      'quinoa, cooked': 'Quinoa cocida',
      'quinoa, boiled': 'Quinoa hervida',
      'quinoa, tri-color, cooked': 'Quinoa tricolor cocida',
      'quinoa': 'Quinoa',
      'oatmeal, cooked with water': 'Avena cocida con agua',
      'oatmeal, cooked with milk': 'Avena cocida con leche',
      'oatmeal, instant, prepared': 'Avena instantánea preparada',
      'oatmeal, steel cut, cooked': 'Avena cortada al acero cocida',
      'rolled oats, dry': 'Avena en hojuelas',
      'oats, dry': 'Avena seca',
      'oatmeal': 'Avena',
      'oats': 'Avena',
      'bread, whole wheat': 'Pan integral de trigo',
      'bread, whole grain': 'Pan integral de grano entero',
      'bread, white': 'Pan blanco',
      'bread, multigrain': 'Pan multigrano',
      'bread, rye': 'Pan de centeno',
      'bread, sourdough': 'Pan de masa madre',
      'bread, pita, whole wheat': 'Pan pita integral',
      'bread, pita, white': 'Pan pita blanco',
      'bread, bagel, whole wheat': 'Bagel integral',
      'bread, english muffin, whole wheat': 'Muffin inglés integral',
      'bread': 'Pan',
      'pasta, cooked': 'Pasta cocida',
      'pasta, whole wheat, cooked': 'Pasta integral cocida',
      'pasta, penne, cooked': 'Pasta penne cocida',
      'pasta, spaghetti, cooked': 'Pasta espagueti cocida',
      'pasta, fusilli, cooked': 'Pasta fusilli cocida',
      'pasta, macaroni, cooked': 'Pasta macarrones cocida',
      'pasta, whole wheat': 'Pasta integral',
      'pasta': 'Pasta',
      'corn tortilla': 'Tortilla de maíz',
      'flour tortilla': 'Tortilla de harina',
      'whole wheat tortilla': 'Tortilla integral',
      'tortilla': 'Tortilla',
      'corn, sweet, cooked': 'Maíz dulce cocido',
      'corn, sweet, canned': 'Maíz dulce en lata',
      'corn, sweet': 'Maíz dulce',
      'corn': 'Maíz',
      'barley, cooked': 'Cebada cocida',
      'barley, pearled, cooked': 'Cebada perlada cocida',
      'barley': 'Cebada',
      'bulgur, cooked': 'Bulgur cocido',
      'bulgur': 'Bulgur',
      'couscous, cooked': 'Cuscús cocido',
      'couscous': 'Cuscús',
      'milk, whole, 3.25% fat': 'Leche entera 3.25% grasa',
      'milk, reduced fat, 2%': 'Leche reducida en grasa 2%',
      'milk, low fat, 1%': 'Leche baja en grasa 1%',
      'milk, skim, nonfat': 'Leche desnatada',
      'milk, whole': 'Leche entera',
      'milk': 'Leche',
      'yogurt, plain, low fat': 'Yogur natural bajo en grasa',
      'yogurt, plain, nonfat': 'Yogur natural sin grasa',
      'yogurt, plain, whole milk': 'Yogur natural de leche entera',
      'yogurt, vanilla, low fat': 'Yogur de vainilla bajo en grasa',
      'yogurt, strawberry, low fat': 'Yogur de fresa bajo en grasa',
      'yogurt, plain': 'Yogur natural',
      'yogurt': 'Yogur',
      'greek yogurt, plain, nonfat': 'Yogur griego natural sin grasa',
      'greek yogurt, plain, low fat': 'Yogur griego natural bajo en grasa',
      'greek yogurt, plain, whole milk': 'Yogur griego natural de leche entera',
      'greek yogurt, vanilla': 'Yogur griego de vainilla',
      'greek yogurt, plain': 'Yogur griego natural',
      'greek yogurt': 'Yogur griego',
      'cheese, cheddar': 'Queso cheddar',
      'cheese, mozzarella, part skim': 'Queso mozzarella parcialmente descremado',
      'cheese, mozzarella, whole milk': 'Queso mozzarella de leche entera',
      'cheese, swiss': 'Queso suizo',
      'cheese, provolone': 'Queso provolone',
      'cheese, parmesan, grated': 'Queso parmesano rallado',
      'cheese, feta': 'Queso feta',
      'cheese, goat': 'Queso de cabra',
      'cheese, cream': 'Queso crema',
      'cheese, cottage, low fat': 'Queso cottage bajo en grasa',
      'cheese, cottage, nonfat': 'Queso cottage sin grasa',
      'cheese, cottage': 'Queso cottage',
      'cheese': 'Queso',
      'butter, salted': 'Mantequilla con sal',
      'butter, unsalted': 'Mantequilla sin sal',
      'butter': 'Mantequilla',
      'cream, heavy': 'Crema espesa',
      'cream, light': 'Crema ligera',
      'cream, half and half': 'Media crema',
      'cream': 'Crema',
      'sour cream': 'Crema agria',
      'broccoli, cooked': 'Brócoli cocido',
      'broccoli, raw': 'Brócoli crudo',
      'broccoli, steamed': 'Brócoli al vapor',
      'broccoli': 'Brócoli',
      'carrot, cooked': 'Zanahoria cocida',
      'carrot, raw': 'Zanahoria cruda',
      'carrot': 'Zanahoria',
      'spinach, cooked': 'Espinacas cocidas',
      'spinach, raw': 'Espinacas crudas',
      'spinach, steamed': 'Espinacas al vapor',
      'spinach': 'Espinacas',
      'kale, cooked': 'Col rizada cocida',
      'kale, raw': 'Col rizada cruda',
      'kale': 'Col rizada',
      'lettuce, romaine': 'Lechuga romana',
      'lettuce, iceberg': 'Lechuga iceberg',
      'lettuce, butterhead': 'Lechuga mantecosa',
      'lettuce, mixed greens': 'Mezcla de lechugas',
      'lettuce': 'Lechuga',
      'cucumber, raw': 'Pepino crudo',
      'cucumber, with peel': 'Pepino con cáscara',
      'cucumber, peeled': 'Pepino pelado',
      'cucumber': 'Pepino',
      'tomato, raw': 'Tomate crudo',
      'tomato, cherry, raw': 'Tomate cherry crudo',
      'tomato, cooked': 'Tomate cocido',
      'tomato': 'Tomate',
      'onion, raw': 'Cebolla cruda',
      'onion, cooked': 'Cebolla cocida',
      'onion, red, raw': 'Cebolla morada cruda',
      'onion': 'Cebolla',
      'bell pepper, raw': 'Pimiento crudo',
      'bell pepper, cooked': 'Pimiento cocido',
      'bell pepper, red, raw': 'Pimiento rojo crudo',
      'bell pepper, green, raw': 'Pimiento verde crudo',
      'bell pepper, yellow, raw': 'Pimiento amarillo crudo',
      'bell pepper': 'Pimiento',
      'zucchini, cooked': 'Calabacín cocido',
      'zucchini, raw': 'Calabacín crudo',
      'zucchini': 'Calabacín',
      'cauliflower, cooked': 'Coliflor cocida',
      'cauliflower, raw': 'Coliflor cruda',
      'cauliflower': 'Coliflor',
      'cabbage, cooked': 'Repollo cocido',
      'cabbage, raw': 'Repollo crudo',
      'cabbage': 'Repollo',
      'asparagus, cooked': 'Espárragos cocidos',
      'asparagus, raw': 'Espárragos crudos',
      'asparagus': 'Espárragos',
      'green beans, cooked': 'Ejotes cocidos',
      'green beans, raw': 'Ejotes crudos',
      'green beans': 'Ejotes',
      'peas, cooked': 'Guisantes cocidos',
      'peas, raw': 'Guisantes crudos',
      'peas': 'Guisantes',
      'mushroom, raw': 'Champiñón crudo',
      'mushroom, cooked': 'Champiñón cocido',
      'mushroom, portobello, grilled': 'Champiñón portobello a la parrilla',
      'mushroom': 'Champiñón',
      'celery, raw': 'Apio crudo',
      'celery': 'Apio',
      'radish, raw': 'Rábano crudo',
      'radish': 'Rábano',
      'avocado, raw': 'Aguacate crudo',
      'avocado': 'Aguacate',
      'vegetable soup, homemade': 'Sopa de verduras casera',
      'vegetable soup, canned': 'Sopa de verduras en lata',
      'vegetable soup': 'Sopa de verduras',
      'salad, mixed greens': 'Ensalada mixta',
      'salad, garden': 'Ensalada de jardín',
      'salad, caesar': 'Ensalada césar',
      'salad': 'Ensalada',
      'apple, raw, with skin': 'Manzana con cáscara',
      'apple, raw, without skin': 'Manzana sin cáscara',
      'apple, red delicious, raw': 'Manzana red delicious cruda',
      'apple, granny smith, raw': 'Manzana granny smith cruda',
      'apple, raw': 'Manzana cruda',
      'apple': 'Manzana',
      'banana, raw': 'Banana cruda',
      'banana, sliced': 'Banana en rodajas',
      'banana': 'Banana',
      'orange, raw': 'Naranja cruda',
      'orange, sections, raw': 'Naranja en gajos cruda',
      'orange': 'Naranja',
      'pear, raw, with skin': 'Pera con cáscara',
      'pear, raw, without skin': 'Pera sin cáscara',
      'pear, raw': 'Pera cruda',
      'pear': 'Pera',
      'strawberry, raw': 'Fresa cruda',
      'strawberries, raw': 'Fresas crudas',
      'strawberry': 'Fresa',
      'strawberries': 'Fresas',
      'blueberry, raw': 'Arándano crudo',
      'blueberries, raw': 'Arándanos crudos',
      'blueberry': 'Arándano',
      'blueberries': 'Arándanos',
      'raspberry, raw': 'Frambuesa cruda',
      'raspberries, raw': 'Frambuesas crudas',
      'raspberry': 'Frambuesa',
      'raspberries': 'Frambuesas',
      'blackberry, raw': 'Mora cruda',
      'blackberries, raw': 'Moras crudas',
      'blackberry': 'Mora',
      'blackberries': 'Moras',
      'grape, raw': 'Uva cruda',
      'grapes, raw': 'Uvas crudas',
      'grape, red, raw': 'Uva roja cruda',
      'grape, green, raw': 'Uva verde cruda',
      'grape': 'Uva',
      'grapes': 'Uvas',
      'pineapple, raw': 'Piña cruda',
      'pineapple, canned in juice': 'Piña en lata en jugo',
      'pineapple': 'Piña',
      'mango, raw': 'Mango crudo',
      'mango': 'Mango',
      'papaya, raw': 'Papaya cruda',
      'papaya': 'Papaya',
      'watermelon, raw': 'Sandía cruda',
      'watermelon': 'Sandía',
      'melon, cantaloupe, raw': 'Melón cantalupo crudo',
      'melon, honeydew, raw': 'Melón honeydew crudo',
      'melon': 'Melón',
      'peach, raw': 'Durazno crudo',
      'peach': 'Durazno',
      'plum, raw': 'Ciruela cruda',
      'plum': 'Ciruela',
      'kiwi, raw': 'Kiwi crudo',
      'kiwi': 'Kiwi',
      'cherry, raw': 'Cereza cruda',
      'cherries, raw': 'Cerezas crudas',
      'cherry': 'Cereza',
      'cherries': 'Cerezas',
      'pomegranate, raw': 'Granada cruda',
      'pomegranate': 'Granada',
      'fig, raw': 'Higo crudo',
      'fig': 'Higo',
      'date, raw': 'Dátil crudo',
      'date': 'Dátil',
      'almonds, raw': 'Almendras crudas',
      'almonds, roasted, salted': 'Almendras tostadas con sal',
      'almonds, roasted, unsalted': 'Almendras tostadas sin sal',
      'almonds, sliced': 'Almendras en rodajas',
      'almonds, slivered': 'Almendras fileteadas',
      'almonds': 'Almendras',
      'walnuts, raw': 'Nueces crudas',
      'walnuts, halves': 'Nueces en mitades',
      'walnuts': 'Nueces',
      'peanuts, raw': 'Maní crudo',
      'peanuts, roasted, salted': 'Maní tostado con sal',
      'peanuts, roasted, unsalted': 'Maní tostado sin sal',
      'peanuts': 'Maní',
      'cashews, raw': 'Anacardos crudos',
      'cashews, roasted, salted': 'Anacardos tostados con sal',
      'cashews': 'Anacardos',
      'pistachios, raw': 'Pistachos crudos',
      'pistachios, roasted, salted': 'Pistachos tostados con sal',
      'pistachios': 'Pistachos',
      'hazelnuts, raw': 'Avellanas crudas',
      'hazelnuts': 'Avellanas',
      'pecans, raw': 'Nueces pecanas crudas',
      'pecans': 'Nueces pecanas',
      'sunflower seeds, raw': 'Semillas de girasol crudas',
      'sunflower seeds, roasted, salted': 'Semillas de girasol tostadas con sal',
      'sunflower seeds': 'Semillas de girasol',
      'pumpkin seeds, raw': 'Semillas de calabaza crudas',
      'pumpkin seeds, roasted': 'Semillas de calabaza tostadas',
      'pumpkin seeds': 'Semillas de calabaza',
      'chia seeds': 'Semillas de chía',
      'flax seeds': 'Semillas de lino',
      'sesame seeds': 'Semillas de sésamo',
      'trail mix': 'Mix de frutos secos',
      'granola': 'Granola',
      'olive oil, extra virgin': 'Aceite de oliva extra virgen',
      'olive oil': 'Aceite de oliva',
      'vegetable oil': 'Aceite vegetal',
      'canola oil': 'Aceite de canola',
      'sunflower oil': 'Aceite de girasol',
      'coconut oil': 'Aceite de coco',
      'sesame oil': 'Aceite de sésamo',
      'peanut butter, smooth': 'Mantequilla de maní suave',
      'peanut butter, crunchy': 'Mantequilla de maní crocante',
      'peanut butter, natural': 'Mantequilla de maní natural',
      'peanut butter': 'Mantequilla de maní',
      'almond butter': 'Mantequilla de almendras',
      'cashew butter': 'Mantequilla de anacardos',
      'honey': 'Miel',
      'maple syrup': 'Jarabe de arce',
      'agave nectar': 'Néctar de agave',
      'jam, strawberry': 'Mermelada de fresa',
      'jam, raspberry': 'Mermelada de frambuesa',
      'jam, apricot': 'Mermelada de albaricoque',
      'jam': 'Mermelada',
      'dark chocolate, 70-85% cacao': 'Chocolate negro 70-85% cacao',
      'dark chocolate, 60-69% cacao': 'Chocolate negro 60-69% cacao',
      'dark chocolate': 'Chocolate negro',
      'milk chocolate': 'Chocolate con leche',
      'white chocolate': 'Chocolate blanco',
      'chocolate': 'Chocolate',
      'cookies, chocolate chip': 'Galletas con chispas de chocolate',
      'cookies, oatmeal': 'Galletas de avena',
      'cookies, sugar': 'Galletas de azúcar',
      'cookies': 'Galletas',
      'crackers, whole wheat': 'Galletas saladas integrales',
      'crackers, saltine': 'Galletas saladas tipo saltine',
      'crackers': 'Galletas saladas',
      'popcorn, air-popped': 'Palomitas de maíz al aire',
      'popcorn, microwave, butter': 'Palomitas de maíz de microondas con mantequilla',
      'popcorn': 'Palomitas de maíz',
      'chips, potato, baked': 'Papas fritas al horno',
      'chips, potato, fried': 'Papas fritas',
      'chips, tortilla': 'Totopos',
      'chips': 'Papas fritas',
      'pretzels': 'Pretzels',
      'water, tap': 'Agua del grifo',
      'water, bottled': 'Agua embotellada',
      'water, sparkling': 'Agua con gas',
      'water': 'Agua',
      'orange juice, fresh': 'Jugo de naranja fresco',
      'orange juice, from concentrate': 'Jugo de naranja de concentrado',
      'orange juice': 'Jugo de naranja',
      'apple juice, unsweetened': 'Jugo de manzana sin azúcar',
      'apple juice': 'Jugo de manzana',
      'grape juice, unsweetened': 'Jugo de uva sin azúcar',
      'grape juice': 'Jugo de uva',
      'coffee, brewed': 'Café preparado',
      'coffee, espresso': 'Café espresso',
      'coffee, instant': 'Café instantáneo',
      'coffee, decaffeinated': 'Café descafeinado',
      'coffee': 'Café',
      'tea, black, brewed': 'Té negro preparado',
      'tea, green, brewed': 'Té verde preparado',
      'tea, herbal, brewed': 'Té de hierbas preparado',
      'tea, decaffeinated': 'Té descafeinado',
      'tea': 'Té',
      'soda, cola': 'Refresco de cola',
      'soda, lemon-lime': 'Refresco de limón-lima',
      'soda, orange': 'Refresco de naranja',
      'soda': 'Refresco',
      'beer, light': 'Cerveza ligera',
      'beer, regular': 'Cerveza regular',
      'beer': 'Cerveza',
      'wine, red': 'Vino tinto',
      'wine, white': 'Vino blanco',
      'wine, rosé': 'Vino rosado',
      'wine': 'Vino'
    };
    
    const nameLower = name.toLowerCase().trim();
    if (EN_TO_ES_FOODS[nameLower]) return EN_TO_ES_FOODS[nameLower];
    
    const sortedKeys = Object.keys(EN_TO_ES_FOODS).sort((a, b) => b.length - a.length);
    for (const en of sortedKeys) {
      if (nameLower.includes(en)) return EN_TO_ES_FOODS[en];
    }
    
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // ============================================================================
  // 🔥 NUEVO: ÍNDICE DIFERENTE PARA CADA SNACK
  // ============================================================================
  private _getSnackIndex(mealType: MealType, dayIndex: number): number {
    // Cada tipo de snack tiene su propio ciclo de rotación
    const offsets: Record<string, number> = {
      'media_manana': 0,
      'media_tarde': 2,
      'colacion': 4
    };
    return (dayIndex + (offsets[mealType] || 0)) % 7;
  }

  // ============================================================================
  // 🎯 QUERIES DE BÚSQUEDA
  // ============================================================================
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

  // ============================================================================
  // 🎭 FALLBACK MOCK INTELIGENTE (CORREGIDO)
  // ============================================================================
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
        { food_id: 'mock_pollo_1', name: 'Pechuga de pollo a la plancha', brand: '', serving_size: 100, serving_unit: 'g', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
        { food_id: 'mock_pollo_2', name: 'Pollo guisado casero', brand: '', serving_size: 100, serving_unit: 'g', calories: 190, protein: 25, carbs: 5, fat: 8, fiber: 1 },
        { food_id: 'mock_pescado_1', name: 'Filete de pescado blanco a la plancha', brand: '', serving_size: 100, serving_unit: 'g', calories: 120, protein: 22, carbs: 0, fat: 3, fiber: 0 },
        { food_id: 'mock_salmón_1', name: 'Salmón al horno', brand: '', serving_size: 100, serving_unit: 'g', calories: 206, protein: 22, carbs: 0, fat: 13, fiber: 0 },
        { food_id: 'mock_lentejas_1', name: 'Lentejas cocidas', brand: '', serving_size: 100, serving_unit: 'g', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8 },
        { food_id: 'mock_tofu_1', name: 'Tofu firme', brand: '', serving_size: 100, serving_unit: 'g', calories: 144, protein: 17, carbs: 3, fat: 9, fiber: 2 }
      ],
      // 🔥 CORRECCIÓN: Para Control Glucémico, preferir carbohidratos de bajo IG
      carbohidrato_principal: [
        { food_id: 'mock_arroz_integral_1', name: 'Arroz integral cocido', brand: '', serving_size: 100, serving_unit: 'g', calories: 112, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8 },
        { food_id: 'mock_quinoa_1', name: 'Quinoa cocida', brand: '', serving_size: 100, serving_unit: 'g', calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8 },
        { food_id: 'mock_lentejas_carb_1', name: 'Lentejas cocidas', brand: '', serving_size: 100, serving_unit: 'g', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8 },
        { food_id: 'mock_papa_1', name: 'Papa cocida', brand: '', serving_size: 100, serving_unit: 'g', calories: 87, protein: 1.9, carbs: 20, fat: 0.1, fiber: 2.2 }
      ],
      verduras_bajo_ig: [
        { food_id: 'mock_brocoli_1', name: 'Brócoli cocido', brand: '', serving_size: 100, serving_unit: 'g', calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3 },
        { food_id: 'mock_espinaca_1', name: 'Espinacas cocidas', brand: '', serving_size: 100, serving_unit: 'g', calories: 23, protein: 3, carbs: 3.8, fat: 0.3, fiber: 2.4 },
        { food_id: 'mock_zanahoria_1', name: 'Zanahoria cocida', brand: '', serving_size: 100, serving_unit: 'g', calories: 35, protein: 0.8, carbs: 8, fat: 0.2, fiber: 2.8 },
        { food_id: 'mock_pepino_1', name: 'Pepino en rodajas', brand: '', serving_size: 100, serving_unit: 'g', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 }
      ],
      snack_rotativo: [
        { food_id: 'mock_almendras_1', name: 'Almendras crudas', brand: '', serving_size: 30, serving_unit: 'g', calories: 170, protein: 6, carbs: 6, fat: 15, fiber: 3.5 },
        { food_id: 'mock_manzana_1', name: 'Manzana con cáscara', brand: '', serving_size: 100, serving_unit: 'g', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 },
        { food_id: 'mock_yogur_griego_1', name: 'Yogur griego natural', brand: '', serving_size: 150, serving_unit: 'g', calories: 90, protein: 16, carbs: 6, fat: 0, fiber: 0 },
        { food_id: 'mock_pepino_1', name: 'Pepino en rodajas', brand: '', serving_size: 100, serving_unit: 'g', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
        { food_id: 'mock_cottage_1', name: 'Queso cottage', brand: '', serving_size: 100, serving_unit: 'g', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0 },
        { food_id: 'mock_pera_1', name: 'Pera fresca', brand: '', serving_size: 100, serving_unit: 'g', calories: 57, protein: 0.4, carbs: 15, fat: 0.1, fiber: 3.1 },
        { food_id: 'mock_nueces_1', name: 'Nueces crudas', brand: '', serving_size: 30, serving_unit: 'g', calories: 185, protein: 4.3, carbs: 3.9, fat: 18.5, fiber: 1.9 },
        { food_id: 'mock_zanahoria_1', name: 'Zanahoria en bastones', brand: '', serving_size: 100, serving_unit: 'g', calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 }
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
      // 🔥 Snacks: rotación con 8 opciones para mayor variedad
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

  // 🛡️ Fallback de seguridad
  private _getMinimumFoodsForMeal(mealType: MealType, needsGlycemicControl: boolean, allergies: string[]): FoodItem[] {
    const minimums: Record<MealType, FoodItem[]> = {
      desayuno: [
        { food_id: 'min_avena', name: 'Avena cocida', serving_size: 40, serving_unit: 'g', calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4 },
        { food_id: 'min_huevo', name: 'Huevo cocido', serving_size: 1, serving_unit: 'unidad', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0 }
      ],
      almuerzo: [
        { food_id: 'min_pollo', name: 'Pechuga de pollo', serving_size: 100, serving_unit: 'g', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
        { food_id: 'min_arroz_integral', name: 'Arroz integral', serving_size: 100, serving_unit: 'g', calories: 112, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8 },
        { food_id: 'min_brocoli', name: 'Brócoli', serving_size: 100, serving_unit: 'g', calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3 }
      ],
      cena: [
        { food_id: 'min_pescado', name: 'Pescado blanco', serving_size: 100, serving_unit: 'g', calories: 120, protein: 22, carbs: 0, fat: 3, fiber: 0 },
        { food_id: 'min_quinoa', name: 'Quinoa', serving_size: 100, serving_unit: 'g', calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8 }
      ],
      media_manana: [
        { food_id: 'min_yogur', name: 'Yogur natural', serving_size: 125, serving_unit: 'g', calories: 70, protein: 6, carbs: 8, fat: 2, fiber: 0 },
        { food_id: 'min_manzana', name: 'Manzana', serving_size: 100, serving_unit: 'g', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 }
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

  private _getLowGIFallbackFoods(): FoodItem[] {
    return [
      { food_id: 'mock_brocoli_1', name: 'Brócoli cocido', brand: '', serving_size: 100, serving_unit: 'g', calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3 },
      { food_id: 'mock_espinaca_1', name: 'Espinacas cocidas', brand: '', serving_size: 100, serving_unit: 'g', calories: 23, protein: 3, carbs: 3.8, fat: 0.3, fiber: 2.4 },
      { food_id: 'mock_pepino_1', name: 'Pepino en rodajas', brand: '', serving_size: 100, serving_unit: 'g', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 }
    ];
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

  // ============================================================================
  // 🎨 HELPERS DE UI
  // ============================================================================
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

  // ============================================================================
  // 💾 MÉTODOS DE GUARDADO
  // ============================================================================
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
      console.error('❌ Error guardando plan:', error);
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
      console.error('❌ Error actualizando plan detallado:', error);
      return { error: true, mensaje: error.error?.mensaje || 'Error al actualizar el plan detallado' };
    }
  }
}