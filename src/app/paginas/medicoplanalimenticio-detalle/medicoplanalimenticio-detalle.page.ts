// src/app/paginas/medicoplanalimenticio-detalle/medicoplanalimenticio-detalle.page.ts
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicoplanalimenticio-detalle',
  templateUrl: './medicoplanalimenticio-detalle.page.html',
  styleUrls: ['./medicoplanalimenticio-detalle.page.scss'],
  standalone: false,
})
export class MedicoplanalimenticioDetallePage implements OnInit {

  // 👤 UI State (sidebar)
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = '';
  especialidad: string = '';

  // 📋 Datos del plan
  plan: any = null;
  paciente: { nombre: string; id: string } | null = null;
  cargando = true;
  error: string | null = null;

  // 📅 Vista actual
  vistaActual: 'semana' | 'dia' | 'mes' = 'semana';
  fechaSeleccionada: string = new Date().toISOString();
  diaSeleccionado: any = null;

  private planId: string | null = null;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    await this.inicializarPlan();
  }

  private cargarDatosUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Médico Especialista' : 'Nutricionista';
      } catch (e) { console.warn('⚠️ Error parseando usuario'); }
    }
  }

  async inicializarPlan() {
    this.cargando = true;
    
    try {
      const navigation = this.router.getCurrentNavigation();
      this.planId = navigation?.extras?.state?.['planId'] || 
                    this.activatedRoute.snapshot.paramMap.get('id');
      
      const pacienteId = navigation?.extras?.state?.['pacienteId'];
      const pacienteNombre = navigation?.extras?.state?.['pacienteNombre'];
      
      if (!this.planId) {
        throw new Error('No se encontró el ID del plan');
      }

      this.paciente = { nombre: pacienteNombre || 'Paciente', id: pacienteId || '' };
      
      await this.cargarPlanDesdeAPI(this.planId);
      
    } catch (error: any) {
      console.error('❌ Error cargando plan:', error);
      this.error = error.message || 'No se pudo cargar el plan';
      await this.showToast('Error al cargar el plan alimenticio', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  private async cargarPlanDesdeAPI(planId: string) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Sin autenticación');

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    
    const response: any = await firstValueFrom(
      this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/plan-nutricional/${planId}`,
        { headers }
      )
    );

    if (response?.error || !response?.plan) {
      throw new Error(response?.mensaje || 'Plan no encontrado');
    }

    this.plan = response.plan;
    
    if (response.plan.paciente_nombre_completo) {
      this.paciente = { 
        nombre: response.plan.paciente_nombre_completo,
        id: response.plan.paciente_id 
      };
    }

    if (this.plan?.plan_detallado?.weekly?.days?.[0]) {
      this.fechaSeleccionada = this.plan.plan_detallado.weekly.days[0].date;
      this.diaSeleccionado = this.plan.plan_detallado.weekly.days[0];
    }
  }

  cambiarVista() {
    if (this.vistaActual === 'dia' && this.plan?.plan_detallado) {
      this.cargarDiaSeleccionado();
    }
  }

  cargarDiaSeleccionado() {
    if (!this.plan?.plan_detallado) return;
    this.diaSeleccionado = this.plan.plan_detallado.weekly.days.find(
      (d: any) => d.date === this.fechaSeleccionada.split('T')[0]
    ) || null;
  }

  getMealIcon(mealType: string): string {
    const icons: Record<string, string> = {
      desayuno: 'sunny-outline', media_manana: 'cafe-outline', almuerzo: 'restaurant-outline',
      media_tarde: 'ice-cream-outline', cena: 'moon-outline', colacion: 'moon-outline'
    };
    return icons[mealType] || 'restaurant-outline';
  }

  getMealLabel(mealType: string): string {
    const labels: Record<string, string> = {
      desayuno: 'Desayuno', media_manana: 'Media Mañana', almuerzo: 'Almuerzo',
      media_tarde: 'Media Tarde', cena: 'Cena', colacion: 'Colación'
    };
    return labels[mealType] || mealType;
  }

  getMealChipColor(calories: number, dailyTotal: number): string {
    const ratio = dailyTotal > 0 ? calories / dailyTotal : 0;
    if (ratio > 0.4) return 'danger';
    if (ratio > 0.3) return 'warning';
    return 'success';
  }

  isToday(week: number, day: number): boolean {
    if (!this.plan?.plan_detallado) return false;
    const today = new Date();
    const planStart = new Date(this.plan.plan_detallado.weekly.start_date);
    const targetDate = new Date(planStart);
    targetDate.setDate(planStart.getDate() + (week - 1) * 7 + (day - 1));
    return targetDate.toDateString() === today.toDateString();
  }

  async imprimirPlan() {
    window.print();
    await this.showToast('🖨️ Abriendo vista de impresión...', 'primary');
  }

  async compartirPlan() {
    if (!this.plan) return;
    const alert = await this.alertCtrl.create({
      header: 'Compartir Plan',
      message: '¿Cómo deseas compartir este plan con el paciente?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'WhatsApp', handler: () => this.compartirPorApp('whatsapp') },
        { text: 'Email', handler: () => this.compartirPorApp('email') }
      ]
    });
    await alert.present();
  }

  private async compartirPorApp(app: 'whatsapp' | 'email') {
    if (!this.plan || !this.paciente) return;
    const message = `🥗 Tu Plan Alimenticio Personalizado\n\nPaciente: ${this.paciente.nombre}\nPerfil: ${this.plan.perfil_recomendado}\nCalorías diarias: ${this.plan.plan_detallado?.weekly?.days?.[0]?.daily_totals?.calories || 0} kcal\n\n📅 Semana del ${this.plan.plan_detallado?.weekly?.start_date} al ${this.plan.plan_detallado?.weekly?.end_date}\n\nRecomendación: "${this.plan.recomendaciones}"`;
    
    if (app === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.location.href = `mailto:?subject=Tu Plan Alimenticio&body=${encodeURIComponent(message)}`;
    }
    await this.showToast('✅ Plan compartido', 'success');
  }

  async descargarPDF() {
    await this.showToast('📄 Generando PDF... (Funcionalidad en desarrollo)', 'primary');
  }

  volver() {
    this.router.navigate(['/medicoverpacientes']);
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  toggleSubmenu(item: string) { this.submenuAbierto = this.submenuAbierto === item ? null : item; }
  irAInicio() { this.router.navigate(['/medico']); }

  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary') {
    const toast = await this.toastCtrl.create({ 
      message, 
      color, 
      duration: 3000, 
      position: 'bottom' 
    });
    await toast.present();
  }

  // ============================================================================
  // 🔘 MÉTODOS DE NAVEGACIÓN PARA SIDEBAR (AGREGADO)
  // ============================================================================
  
  // 🧭 Navegar a otra página
  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'agregar-paciente': '/agregar-paciente',
      'buscar-paciente': '/buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'medicoinformes': '/medicoinformes',
      'medico-configuracion': '/medico-configuracion'
    };

    const rutaDestino = rutas[ruta] || `/${ruta}`;
    this.router.navigate([rutaDestino]);
  }
}