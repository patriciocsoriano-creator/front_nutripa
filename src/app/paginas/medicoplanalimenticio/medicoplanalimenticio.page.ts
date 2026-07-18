// src/app/paginas/medicoplanalimenticio/medicoplanalimenticio.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { LoadingController, ToastController, AlertController, Platform } from '@ionic/angular';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

import { 
  GeneratedNutritionPlan, 
  DayPlan, 
  MealType, 
  PlanGenerationInput,
  PlanSaveResponse 
} from 'src/app/models/nutrition-plan.model';
import { NutritionPlanService } from 'src/app/services/nutrition-plan';

@Component({
  selector: 'app-medicoplanalimenticio',
  templateUrl: './medicoplanalimenticio.page.html',
  styleUrls: ['./medicoplanalimenticio.page.scss'],
  standalone: false,
})
export class MedicoplanalimenticioPage implements OnInit, OnDestroy {

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = '';
  especialidad: string = '';
  private destroy$ = new Subject<void>();
  private isMobile = false;

  plan: GeneratedNutritionPlan | null = null;
  cargando = true;
  error: string | null = null;

  vistaActual: 'semana' | 'dia' | 'mes' = 'semana';
  fechaSeleccionada: string = new Date().toISOString();
  diaSeleccionado: DayPlan | null = null;

  private planInput: PlanGenerationInput | null = null;
  private planIdBase: string | null = null;  //  ID del plan base creado en medicocrearplan

  constructor(
  private router: Router,
  private activatedRoute: ActivatedRoute,
  private nutritionPlanService: NutritionPlanService,
  private loadingCtrl: LoadingController,
  private toastCtrl: ToastController,
  private alertCtrl: AlertController,
  private platform: Platform,
  private http: HttpClient
) {
  this.platform.ready().then(() => {
    this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
    //  Forzar abierto si NO es móvil
    if (!this.isMobile) {
      this.sidebarOpen = true;
    }
  });
}

  async ngOnInit() {
    this.cargarDatosUsuario();
    await this.inicializarPlan();
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isMobile && this.sidebarOpen) this.sidebarOpen = false;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDatosUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Médico Especialista' : 'Nutricionista';
      } catch (e) { console.warn(' Error parseando usuario'); }
    }
  }

  private async inicializarPlan() {
    this.cargando = true;
    try {
      const navigation = this.router.getCurrentNavigation();
      
      //  Obtener planData Y planId del state del router
      const planData = navigation?.extras?.state?.['planData'] as PlanGenerationInput | null;
      const planIdRecibido = navigation?.extras?.state?.['planId'] as string | null;
      
      if (!planData) {
        throw new Error('No se recibió información del plan para generar');
      }
      
      this.planInput = planData;
      this.planIdBase = planIdRecibido;  //  Guardar ID del plan base
      
      console.log(' [PLAN] Plan base ID recibido:', this.planIdBase);
      
      // Generar plan detallado con alimentos
      this.plan = await this.nutritionPlanService.generatePlan(this.planInput);

//  FORZAR MACROS CORRECTOS SEGÚN EL PERFIL CLÍNICO
if (this.plan) {
  const profileMacros: Record<string, { protein: number; carbs: number; fat: number }> = {
    'Control Glucemico': { protein: 30, carbs: 40, fat: 30 },   // Más grasa/proteína para saciedad y bajo IG distribucion calorica
    'Normocalorico': { protein: 25, carbs: 50, fat: 25 },   // Balance estándar para mantenimiento
    'Hipocalorico': { protein: 35, carbs: 40, fat: 25 },
    'Hipograsa': { protein: 25, carbs: 55, fat: 20 }   // ¡GRASA AL 20%! unido modificar documento
  };
  
  this.plan.macro_distribution = profileMacros[this.plan.profile_type] || profileMacros['Normocalorico'];
  
  console.log(' [PLAN] Macros forzados para perfil', this.plan.profile_type, ':', this.plan.macro_distribution);
}

if (this.plan?.plan.weekly.days.length) {
  this.fechaSeleccionada = this.plan.plan.weekly.days[0].date;
  this.diaSeleccionado = this.plan.plan.weekly.days[0];
}
      
    } catch (error: any) {
      console.error(' Error generando plan:', error);
      this.error = error.message || 'No se pudo generar el plan alimenticio';
      await this.showToast('Error generando plan. Verifica la conexión a FatSecret API.', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  cambiarVista() {
    if (this.vistaActual === 'dia' && this.plan) {
      this.cargarDiaSeleccionado();
    }
  }

  cargarDiaSeleccionado() {
    if (!this.plan) return;
    this.diaSeleccionado = this.plan.plan.weekly.days.find(
      d => d.date === this.fechaSeleccionada.split('T')[0]
    ) || null;
  }

  getMealIcon(mealType: MealType): string {
    const icons: Record<MealType, string> = {
      desayuno: 'sunny-outline', media_manana: 'cafe-outline', almuerzo: 'restaurant-outline',
      media_tarde: 'ice-cream-outline', cena: 'moon-outline', colacion: 'moon-outline'
    };
    return icons[mealType] || 'restaurant-outline';
  }

  getMealLabel(mealType: MealType): string {
    const labels: Record<MealType, string> = {
      desayuno: 'Desayuno', media_manana: 'Media Mañana', almuerzo: 'Almuerzo',
      media_tarde: 'Media Tarde', cena: 'Cena', colacion: 'Colación'
    };
    return labels[mealType];
  }

  getMealChipColor(calories: number, dailyTotal: number): string {
    const ratio = dailyTotal > 0 ? calories / dailyTotal : 0;
    if (ratio > 0.4) return 'danger';
    if (ratio > 0.3) return 'warning';
    return 'success';
  }

  isToday(week: number, day: number): boolean {
    if (!this.plan) return false;
    const today = new Date();
    const planStart = new Date(this.plan.plan.weekly.start_date);
    const targetDate = new Date(planStart);
    targetDate.setDate(planStart.getDate() + (week - 1) * 7 + (day - 1));
    return targetDate.toDateString() === today.toDateString();
  }

  hasPlanForDay(_week: number, _day: number): boolean { return true; }

  async descargarPDF() {
    await this.showToast(' Generando PDF... (Funcionalidad en desarrollo)', 'primary');
  }

  async compartirPlan() {
    if (!this.plan) return;
    const alert = await this.alertCtrl.create({
      header: 'Compartir Plan',
      message: '¿Cómo deseas compartir este plan con el paciente?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'WhatsApp', handler: () => this.compartirPorApp('whatsapp') },
        { text: 'Email', handler: () => this.compartirPorApp('email') },
        { text: 'Imprimir', handler: () => this.imprimirPlan() }
      ]
    });
    await alert.present();
  }

  private async compartirPorApp(app: 'whatsapp' | 'email') {
    if (!this.plan) return;
    const message = ` Tu Plan Alimenticio Personalizado\n\nPaciente: ${this.plan.patient_name}\nPerfil: ${this.plan.profile_type}\nCalorías diarias: ${this.plan.daily_calorie_target} kcal\n\n📅 Semana del ${this.plan.plan.weekly.start_date} al ${this.plan.plan.weekly.end_date}\n\nRecomendación principal:\n"${this.plan.recommendations.main}"`;
    
    if (app === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.location.href = `mailto:?subject=Tu Plan Alimenticio&body=${encodeURIComponent(message)}`;
    }
    await this.showToast(' Plan compartido', 'success');
  }

  async imprimirPlan() {
    window.print();
    await this.showToast(' Abriendo vista de impresión...', 'primary');
  }

  /**
   *  CONFIRMAR Y ENVIAR: ACTUALIZA el plan existente con plan_detallado
   * NO crea un nuevo registro, evita duplicados
   */
  async confirmarYEnviar() {
    //  Validar que plan y planInput no sean null
    if (!this.plan || !this.planInput) {
      await this.showToast(' No hay plan para confirmar', 'warning');
      return;
    }
    
    //  Validar que tenemos el planIdBase del paso anterior
    if (!this.planIdBase) {
      await this.showToast(' No se encontró el plan base. Por favor, reinicia el proceso.', 'warning');
      return;
    }
    
    //  Guardar referencias locales no-null para evitar errores de TypeScript en async handler
    const planToSave: GeneratedNutritionPlan = this.plan;
    const planInputToUse: PlanGenerationInput = this.planInput;
    const planIdToUpdate: string = this.planIdBase;
    
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Plan',
      message: `¿Deseas confirmar y enviar este plan alimenticio a <strong>${planToSave.patient_name}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Sí, Confirmar y Enviar', 
          cssClass: 'alert-button-confirm', 
          handler: async () => {
            const loading = await this.loadingCtrl.create({ 
              message: 'Guardando plan detallado con alimentos...', 
              spinner: 'crescent' 
            });
            await loading.present();
            
            try {
              //  ACTUALIZAR plan_detallado del plan existente (NO INSERT nuevo)
              const updateResult = await this.nutritionPlanService.updatePlanDetail(
                planIdToUpdate,  //  ID del plan base creado en medicocrearplan
                planToSave.plan  //  Solo el objeto plan { weekly, monthly_summary }
              );
              
              if (updateResult.error) {
                throw new Error(updateResult.mensaje);
              }
              
              await loading.dismiss();
              await this.showToast(' Plan detallado guardado y enviado al paciente', 'success');
              
              // Redirigir al panel de pacientes
              this.router.navigate(['/medicoverpacientes'], { 
                state: { 
                  pacienteId: planToSave.patient_id,
                  planId: planIdToUpdate,  //  Mismo ID, no uno nuevo
                  mensaje: 'Plan confirmado exitosamente'
                } 
              });
              
            } catch (error: any) {
              await loading.dismiss();
              console.error(' Error actualizando plan detallado:', error);
              await this.showToast(` ${error.message || 'Error al guardar el plan detallado'}`, 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  toggleSubmenu(item: string) { this.submenuAbierto = this.submenuAbierto === item ? null : item; }
  irAInicio() { this.router.navigate(['/medico']); }
  volver() { this.router.navigate(['/medicocrearplan']); }

  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary') {
    await this.toastCtrl.create({ message, color, duration: 3000, position: 'bottom' }).then(t => t.present());
  }

  //  Navegar a otra página
  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'agregar-paciente': '/agregar-paciente',
      'buscar-paciente': '/buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'medico-informes': '/medico-informes',
      'configuracion': '/configuracion-medico'
    };

    const rutaDestino = rutas[ruta] || `/${ruta}`;
    this.router.navigate([rutaDestino]);
  }
}