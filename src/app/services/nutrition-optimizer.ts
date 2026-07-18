import { Injectable } from '@angular/core';
import { 
  FoodItem, 
  GeneratedNutritionPlan, 
  MealPlan, 
  DayPlan, 
  MealType
} from '../models/nutrition-plan.model';

// ========================================
// INTERFACES DE VALIDACIÓN Y OBJETIVOS
// ========================================

interface NutritionTargets {
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberMin: number;
  tolerance: number; // porcentaje (ej: 5 = ±5%)
}

interface MacroRules {
  maxProteinPer100g: number;
  maxCarbsPer100g: number;
  maxFatPer100g: number;
}

@Injectable({ providedIn: 'root' })
export class NutritionOptimizerService {
  
  // ========================================
  // REGLAS NUTRICIONALES POR CATEGORÍA
  // ========================================
  // Estos son los valores físicamente posibles por 100g de alimento
  private readonly MACRO_RULES: Record<string, MacroRules> = {
    'fruta': { maxProteinPer100g: 2.0, maxCarbsPer100g: 25, maxFatPer100g: 1.0 },
    'verdura': { maxProteinPer100g: 5.0, maxCarbsPer100g: 12, maxFatPer100g: 1.0 },
    'carne': { maxProteinPer100g: 35, maxCarbsPer100g: 3, maxFatPer100g: 30 },
    'pescado': { maxProteinPer100g: 30, maxCarbsPer100g: 2, maxFatPer100g: 20 },
    'lacteo': { maxProteinPer100g: 20, maxCarbsPer100g: 15, maxFatPer100g: 15 },
    'cereal': { maxProteinPer100g: 15, maxCarbsPer100g: 80, maxFatPer100g: 10 },
    'legumbre': { maxProteinPer100g: 25, maxCarbsPer100g: 60, maxFatPer100g: 5 },
    'fruto_seco': { maxProteinPer100g: 25, maxCarbsPer100g: 25, maxFatPer100g: 70 },
    'default': { maxProteinPer100g: 50, maxCarbsPer100g: 100, maxFatPer100g: 100 }
  };

  // ========================================
  // MÉTODO PRINCIPAL: OPTIMIZAR PLAN COMPLETO
  // ========================================
  optimizePlan(
    plan: GeneratedNutritionPlan,
    targets: NutritionTargets
  ): GeneratedNutritionPlan {
    
    console.log(' [Optimizer] Iniciando optimización del plan...');
    
    // PASO 1: Corregir macros físicamente imposibles
    const planStep1 = this.fixImpossibleMacros(plan);
    
    // PASO 2: Redondear porciones (huevos enteros, gramos sin decimales raros)
    const planStep2 = this.roundPortions(planStep1);
    
    // PASO 3: Eliminar duplicados dentro de cada comida y en el día
    const planStep3 = this.removeDuplicates(planStep2);
    
    // PASO 4: Reemplazar alimentos problemáticos (ej: fresas con proteína alta)
    const planStep4 = this.replaceProblematicFoods(planStep3);
    
    // PASO 5: Ajustar iterativamente hasta cumplir objetivos
    const planStep5 = this.adjustToTargets(planStep4, targets);
    
    // PASO 6: Recalcular totales finales
    const finalPlan = this.recalculateTotals(planStep5);
    
    console.log(' [Optimizer] Optimización completada');
    this.printPlanSummary(finalPlan, targets);
    
    return finalPlan;
  }

  // ========================================
  // PASO 1: CORREGIR MACROS FÍSICAMENTE IMPOSIBLES
  // ========================================
  private fixImpossibleMacros(plan: GeneratedNutritionPlan): GeneratedNutritionPlan {
    const weekPlan = plan.plan.weekly;
    
    weekPlan.days.forEach(day => {
      day.meals.forEach(meal => {
        meal.foods = meal.foods.map(food => this.fixFoodMacros(food));
      });
    });
    
    return plan;
  }

  private fixFoodMacros(food: FoodItem): FoodItem {
    const category = this.getFoodCategory(food.name);
    const rules = this.MACRO_RULES[category] || this.MACRO_RULES['default'];
    
    const servingSize = food.serving_size || 100;
    const multiplier = servingSize / 100;
    
    // Límites máximos según la categoría del alimento
    const maxProtein = rules.maxProteinPer100g * multiplier;
    const maxCarbs = rules.maxCarbsPer100g * multiplier;
    const maxFat = rules.maxFatPer100g * multiplier;
    
    const originalProtein = food.protein;
    const originalCarbs = food.carbs;
    const originalFat = food.fat;
    
    // Corregir si exceden los límites físicos
    let correctedProtein = Math.min(food.protein, maxProtein);
    let correctedCarbs = Math.min(food.carbs, maxCarbs);
    let correctedFat = Math.min(food.fat, maxFat);
    
    // Si hubo corrección, recalcular calorías basándose en macros corregidos
    if (correctedProtein !== originalProtein || 
        correctedCarbs !== originalCarbs || 
        correctedFat !== originalFat) {
      
      console.warn(
        ` [Optimizer] Macros corregidos: ${food.name}`,
        `\n   Antes: P=${originalProtein}g C=${originalCarbs}g G=${originalFat}g`,
        `\n   Ahora: P=${correctedProtein}g C=${correctedCarbs}g G=${correctedFat}g`
      );
      
      // Recalcular calorías basándose en los macros corregidos
      const recalculatedCalories = 
        (correctedProtein * 4) + 
        (correctedCarbs * 4) + 
        (correctedFat * 9);
      
      return {
        ...food,
        protein: this.round(correctedProtein),
        carbs: this.round(correctedCarbs),
        fat: this.round(correctedFat),
        calories: this.round(recalculatedCalories)
      };
    }
    
    return food;
  }

  private getFoodCategory(name: string): string {
    const nameLower = name.toLowerCase();
    
    // Frutas
    if (nameLower.match(/manzana|pera|fresa|banana|plátano|naranja|uva|kiwi|sandía|melón|durazno|mango|piña|arándano|frutilla|berry/)) {
      return 'fruta';
    }
    
    // Verduras
    if (nameLower.match(/brócoli|broccoli|espinaca|zanahoria|pepino|tomate|lechuga|col|repollo|pimiento|apio|calabacín|zucchini|berenjena|verdura|vegetal|choclo|maíz/)) {
      return 'verdura';
    }
    
    // Carnes
    if (nameLower.match(/pollo|pavo|res|cerdo|carne|beef|pork|chicken|turkey|ternera|cordero|bistec|filete|chuleta|molida/)) {
      return 'carne';
    }
    
    // Pescados
    if (nameLower.match(/pescado|salmón|atún|bacalao|tilapia|merluza|trucha|sardina|camarón|langostino|marisco|fish|salmon|tuna/)) {
      return 'pescado';
    }
    
    // Lácteos
    if (nameLower.match(/leche|yogur|yogurt|queso|cottage|requesón|crema|milk|cheese|dairy/)) {
      return 'lacteo';
    }
    
    // Cereales
    if (nameLower.match(/arroz|avena|trigo|pan|pasta|cereal|quinoa|maíz|tortilla|galleta|cracker|bread|rice|oat|wheat/)) {
      return 'cereal';
    }
    
    // Legumbres
    if (nameLower.match(/lenteja|frijol|garbanzo|haba|soja|soya|lupini|bean|lentil|chickpea/)) {
      return 'legumbre';
    }
    
    // Frutos secos
    if (nameLower.match(/almendra|nuez|cacahuate|maní|pistacho|anacardo|nueces|almond|walnut|peanut|nut/)) {
      return 'fruto_seco';
    }
    
    // Tofu y derivados de soja
    if (nameLower.match(/tofu|soja|soya|tempeh|seitan/)) {
      return 'legumbre'; // Similar nutricionalmente
    }
    
    // Huevos
    if (nameLower.match(/huevo|egg/)) {
      return 'default'; // Huevos tienen macros específicos, no aplicar límites estrictos
    }
    
    return 'default';
  }

  // ========================================
  // PASO 2: REDONDEAR PORCIONES
  // ========================================
  private roundPortions(plan: GeneratedNutritionPlan): GeneratedNutritionPlan {
    const weekPlan = plan.plan.weekly;
    
    weekPlan.days.forEach(day => {
      day.meals.forEach(meal => {
        meal.foods = meal.foods.map(food => this.roundFoodPortion(food));
      });
    });
    
    return plan;
  }

  private roundFoodPortion(food: FoodItem): FoodItem {
    const nameLower = food.name.toLowerCase();
    const unit = (food.serving_unit || '').toLowerCase();
    
    // Huevos siempre enteros
    if (nameLower.includes('huevo') || nameLower.includes('egg') || unit === 'unidad') {
      const unidades = Math.max(1, Math.round(food.serving_size));
      const factor = unidades / food.serving_size;
      
      return {
        ...food,
        serving_size: unidades,
        serving_unit: 'unidad',
        calories: this.round(food.calories * factor),
        protein: this.round(food.protein * factor),
        carbs: this.round(food.carbs * factor),
        fat: this.round(food.fat * factor)
      };
    }
    
    // Rebanadas siempre enteras
    if (unit.includes('rebanada') || unit.includes('slice')) {
      const rebanadas = Math.max(1, Math.round(food.serving_size));
      const factor = rebanadas / food.serving_size;
      
      return {
        ...food,
        serving_size: rebanadas,
        calories: this.round(food.calories * factor),
        protein: this.round(food.protein * factor),
        carbs: this.round(food.carbs * factor),
        fat: this.round(food.fat * factor)
      };
    }
    
    // Gramos redondeados a múltiplos de 5
    if (unit === 'g' || unit === 'gramo' || unit === 'gramos') {
      const gramos = Math.round(food.serving_size / 5) * 5;
      const factor = gramos / food.serving_size;
      
      return {
        ...food,
        serving_size: gramos,
        calories: this.round(food.calories * factor),
        protein: this.round(food.protein * factor),
        carbs: this.round(food.carbs * factor),
        fat: this.round(food.fat * factor)
      };
    }
    
    // Mililitros redondeados a múltiplos de 10
    if (unit === 'ml' || unit === 'mililitro') {
      const ml = Math.round(food.serving_size / 10) * 10;
      const factor = ml / food.serving_size;
      
      return {
        ...food,
        serving_size: ml,
        calories: this.round(food.calories * factor),
        protein: this.round(food.protein * factor),
        carbs: this.round(food.carbs * factor),
        fat: this.round(food.fat * factor)
      };
    }
    
    return food;
  }

  // ========================================
  // PASO 3: ELIMINAR DUPLICADOS
  // ========================================
  private removeDuplicates(plan: GeneratedNutritionPlan): GeneratedNutritionPlan {
    const weekPlan = plan.plan.weekly;
    
    weekPlan.days.forEach(day => {
      // Rastrear alimentos ya usados en el día
      const dailyFoods = new Set<string>();
      
      day.meals.forEach(meal => {
        const uniqueFoods: FoodItem[] = [];
        
        meal.foods.forEach(food => {
          const key = this.normalizeFoodName(food.name);
          
          if (!dailyFoods.has(key)) {
            dailyFoods.add(key);
            uniqueFoods.push(food);
          } else {
            console.warn(` [Optimizer] Eliminado duplicado del día: ${food.name}`);
          }
        });
        
        meal.foods = uniqueFoods;
      });
    });
    
    return plan;
  }

  private normalizeFoodName(name: string): string {
    return name.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/a la plancha|al horno|cocido|asado|guisado/g, '')
      .trim();
  }

  // ========================================
  // PASO 4: REEMPLAZAR ALIMENTOS PROBLEMÁTICOS
  // ========================================
  private replaceProblematicFoods(plan: GeneratedNutritionPlan): GeneratedNutritionPlan {
    const weekPlan = plan.plan.weekly;
    
    weekPlan.days.forEach(day => {
      day.meals.forEach(meal => {
        meal.foods = meal.foods.map(food => {
          // Si después de las correcciones, una fruta sigue con proteína alta
          const category = this.getFoodCategory(food.name);
          
          if (category === 'fruta' && food.protein > 3) {
            console.warn(` [Optimizer] Reemplazando fruta problemática: ${food.name}`);
            return this.getDefaultFruit(food.serving_size);
          }
          
          if (category === 'verdura' && food.protein > 5) {
            console.warn(` [Optimizer] Reemplazando verdura problemática: ${food.name}`);
            return this.getDefaultVegetable(food.serving_size);
          }
          
          return food;
        });
      });
    });
    
    return plan;
  }

  private getDefaultFruit(servingSize: number): FoodItem {
    const factor = servingSize / 150;
    return {
      food_id: 'default_manzana',
      name: 'Manzana con cáscara',
      brand: '',
      serving_size: servingSize,
      serving_unit: 'g',
      calories: this.round(78 * factor),
      protein: this.round(0.5 * factor),
      carbs: this.round(21 * factor),
      fat: this.round(0.3 * factor),
      fiber: this.round(3.6 * factor)
    };
  }

  private getDefaultVegetable(servingSize: number): FoodItem {
    const factor = servingSize / 100;
    return {
      food_id: 'default_brocoli',
      name: 'Brócoli cocido',
      brand: '',
      serving_size: servingSize,
      serving_unit: 'g',
      calories: this.round(35 * factor),
      protein: this.round(2.4 * factor),
      carbs: this.round(7 * factor),
      fat: this.round(0.4 * factor),
      fiber: this.round(3.3 * factor)
    };
  }

  // ========================================
  // PASO 5: AJUSTAR ITERATIVO HASTA CUMPLIR OBJETIVOS
  // ========================================
  private adjustToTargets(
    plan: GeneratedNutritionPlan,
    targets: NutritionTargets
  ): GeneratedNutritionPlan {
    const maxAttempts = 20;
    let attempt = 0;
    let currentPlan = plan;
    
    while (attempt < maxAttempts) {
      const totals = this.calculateDailyTotals(currentPlan);
      
      // Calcular desviaciones
      const calorieDeviation = (totals.calories - targets.calories) / targets.calories;
      const proteinDeviation = (totals.protein - targets.proteinGrams) / targets.proteinGrams;
      const carbDeviation = (totals.carbs - targets.carbGrams) / targets.carbGrams;
      const fatDeviation = (totals.fat - targets.fatGrams) / targets.fatGrams;
      
      const tolerance = targets.tolerance / 100;
      
      // Verificar si está dentro de tolerancia
      const withinTolerance = 
        Math.abs(calorieDeviation) <= tolerance &&
        Math.abs(proteinDeviation) <= tolerance * 2 && // ±10% para macros
        Math.abs(carbDeviation) <= tolerance * 2 &&
        Math.abs(fatDeviation) <= tolerance * 2;
      
      if (withinTolerance) {
        console.log(` [Optimizer] Objetivos cumplidos en intento ${attempt + 1}`);
        break;
      }
      
      console.log(
        ` [Optimizer] Intento ${attempt + 1}:`,
        `\n   Calorías: ${totals.calories.toFixed(0)} (objetivo: ${targets.calories}, desv: ${(calorieDeviation * 100).toFixed(1)}%)`,
        `\n   Proteínas: ${totals.protein.toFixed(1)}g (objetivo: ${targets.proteinGrams.toFixed(1)}g, desv: ${(proteinDeviation * 100).toFixed(1)}%)`,
        `\n   Carbohidratos: ${totals.carbs.toFixed(1)}g (objetivo: ${targets.carbGrams.toFixed(1)}g, desv: ${(carbDeviation * 100).toFixed(1)}%)`,
        `\n   Grasas: ${totals.fat.toFixed(1)}g (objetivo: ${targets.fatGrams.toFixed(1)}g, desv: ${(fatDeviation * 100).toFixed(1)}%)`
      );
      
      // Aplicar ajustes
      currentPlan = this.applyAdjustments(currentPlan, {
        calories: calorieDeviation,
        protein: proteinDeviation,
        carbs: carbDeviation,
        fat: fatDeviation
      });
      
      attempt++;
    }
    
    if (attempt >= maxAttempts) {
      console.warn(` [Optimizer] No se pudo cumplir objetivos después de ${maxAttempts} intentos`);
    }
    
    return currentPlan;
  }

  private calculateDailyTotals(plan: GeneratedNutritionPlan): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  } {
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    const days = plan.plan.weekly.days;
    
    // Promedio de los 7 días
    days.forEach(day => {
      day.meals.forEach(meal => {
        meal.foods.forEach(food => {
          totals.calories += food.calories || 0;
          totals.protein += food.protein || 0;
          totals.carbs += food.carbs || 0;
          totals.fat += food.fat || 0;
          totals.fiber += food.fiber || 0;
        });
      });
    });
    
    return {
      calories: totals.calories / days.length,
      protein: totals.protein / days.length,
      carbs: totals.carbs / days.length,
      fat: totals.fat / days.length,
      fiber: totals.fiber / days.length
    };
  }

  private applyAdjustments(
    plan: GeneratedNutritionPlan,
    deviations: { calories: number; protein: number; carbs: number; fat: number }
  ): GeneratedNutritionPlan {
    const weekPlan = plan.plan.weekly;
    
    weekPlan.days.forEach(day => {
      day.meals.forEach(meal => {
        meal.foods = meal.foods.map(food => {
          const category = this.getFoodCategory(food.name);
          let adjustmentFactor = 1;
          
          // Ajustar según qué macro necesita corrección y qué tipo de alimento es
          if (deviations.protein < -0.1 && category === 'carne' || category === 'pescado' || category === 'lacteo') {
            // Falta proteína → aumentar alimentos proteicos
            adjustmentFactor = Math.min(1.3, 1 + Math.abs(deviations.protein));
          } else if (deviations.protein > 0.1 && (category === 'carne' || category === 'pescado')) {
            // Sobra proteína → reducir alimentos proteicos
            adjustmentFactor = Math.max(0.7, 1 - deviations.protein);
          }
          
          if (deviations.carbs < -0.1 && category === 'cereal' || category === 'legumbre') {
            adjustmentFactor = Math.min(1.3, 1 + Math.abs(deviations.carbs));
          } else if (deviations.carbs > 0.1 && (category === 'cereal' || category === 'legumbre')) {
            adjustmentFactor = Math.max(0.7, 1 - deviations.carbs);
          }
          
          if (deviations.fat < -0.1 && category === 'fruto_seco') {
            adjustmentFactor = Math.min(1.3, 1 + Math.abs(deviations.fat));
          } else if (deviations.fat > 0.1 && category === 'fruto_seco') {
            adjustmentFactor = Math.max(0.7, 1 - deviations.fat);
          }
          
          if (adjustmentFactor === 1) return food;
          
          const newServing = food.serving_size * adjustmentFactor;
          
          // Aplicar límites razonables
          const unit = (food.serving_unit || '').toLowerCase();
          let finalServing = newServing;
          
          if (unit === 'unidad' || unit.includes('rebanada')) {
            finalServing = Math.max(1, Math.round(newServing));
          } else if (unit === 'g') {
            finalServing = Math.round(newServing / 5) * 5;
            finalServing = Math.max(10, Math.min(400, finalServing));
          }
          
          const finalFactor = finalServing / food.serving_size;
          
          return {
            ...food,
            serving_size: finalServing,
            calories: this.round(food.calories * finalFactor),
            protein: this.round(food.protein * finalFactor),
            carbs: this.round(food.carbs * finalFactor),
            fat: this.round(food.fat * finalFactor),
            fiber: food.fiber ? this.round(food.fiber * finalFactor) : undefined
          };
        });
      });
    });
    
    return plan;
  }

  // ========================================
  // PASO 6: RECALCULAR TOTALES FINALES
  // ========================================
  private recalculateTotals(plan: GeneratedNutritionPlan): GeneratedNutritionPlan {
    const weekPlan = plan.plan.weekly;
    
    weekPlan.days.forEach(day => {
      day.meals.forEach(meal => {
        const mealTotals = meal.foods.reduce(
          (acc, food) => ({
            calories: acc.calories + (food.calories || 0),
            protein: acc.protein + (food.protein || 0),
            carbs: acc.carbs + (food.carbs || 0),
            fat: acc.fat + (food.fat || 0)
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        
        meal.total_calories = this.round(mealTotals.calories);
        meal.total_protein = this.round(mealTotals.protein);
        meal.total_carbs = this.round(mealTotals.carbs);
        meal.total_fat = this.round(mealTotals.fat);
      });
      
      // Recalcular totales del día
      const dayTotals = day.meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + meal.total_calories,
          protein: acc.protein + meal.total_protein,
          carbs: acc.carbs + meal.total_carbs,
          fat: acc.fat + meal.total_fat,
          fiber: acc.fiber + meal.foods.reduce((s, f) => s + (f.fiber || 0), 0)
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      );
      
      day.daily_totals = {
        calories: this.round(dayTotals.calories),
        protein: this.round(dayTotals.protein),
        carbs: this.round(dayTotals.carbs),
        fat: this.round(dayTotals.fat),
        fiber: this.round(dayTotals.fiber)
      };
    });
    
    // Recalcular promedio semanal
    const weeklyAvg = weekPlan.days.reduce(
      (acc, day) => acc + day.daily_totals.calories,
      0
    ) / weekPlan.days.length;
    
    weekPlan.weekly_goals.avg_daily_calories = Math.round(weeklyAvg);
    
    return plan;
  }

  // ========================================
  // UTILIDADES
  // ========================================
  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private printPlanSummary(plan: GeneratedNutritionPlan, targets: NutritionTargets): void {
    const totals = this.calculateDailyTotals(plan);
    const tolerance = targets.tolerance;
    
    console.log('\n [Optimizer] RESUMEN FINAL:');
    console.log('─'.repeat(60));
    console.log(
      `Calorías:    ${totals.calories.toFixed(0)} kcal ` +
      `(objetivo: ${targets.calories} ±${tolerance}%) ` +
      `${Math.abs(totals.calories - targets.calories) <= targets.calories * tolerance / 100 ? '✅' : '❌'}`
    );
    console.log(
      `Proteínas:   ${totals.protein.toFixed(1)} g ` +
      `(objetivo: ${targets.proteinGrams.toFixed(1)} g) ` +
      `${Math.abs(totals.protein - targets.proteinGrams) <= targets.proteinGrams * tolerance * 2 / 100 ? '✅' : '❌'}`
    );
    console.log(
      `Carbohidratos: ${totals.carbs.toFixed(1)} g ` +
      `(objetivo: ${targets.carbGrams.toFixed(1)} g) ` +
      `${Math.abs(totals.carbs - targets.carbGrams) <= targets.carbGrams * tolerance * 2 / 100 ? '✅' : '❌'}`
    );
    console.log(
      `Grasas:      ${totals.fat.toFixed(1)} g ` +
      `(objetivo: ${targets.fatGrams.toFixed(1)} g) ` +
      `${Math.abs(totals.fat - targets.fatGrams) <= targets.fatGrams * tolerance * 2 / 100 ? '✅' : '❌'}`
    );
    console.log(
      `Fibra:       ${totals.fiber.toFixed(1)} g ` +
      `(mínimo: ${targets.fiberMin} g) ` +
      `${totals.fiber >= targets.fiberMin ? '✅' : '❌'}`
    );
    console.log('─'.repeat(60));
  }
}