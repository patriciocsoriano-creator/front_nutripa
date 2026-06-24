import { Component, HostListener, OnInit } from '@angular/core';
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

  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';

  // Datos del plan
  plan: any = null;
  paciente: { nombre: string; id: string } | null = null;
  cargando = true;
  error: string | null = null;

  // Vista actual
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

  // Cargar datos del usuario
  private cargarDatosUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Médico Especialista' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Especialista';
      } catch (e) { 
        console.warn('Error parseando usuario'); 
      }
    }
  }

  // Inicializar plan
  async inicializarPlan() {
    this.cargando = true;
    this.error = null;
    
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
      console.error('Error cargando plan:', error);
      this.error = error.message || 'No se pudo cargar el plan';
      await this.showToast('Error al cargar el plan alimenticio', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  // Cargar plan desde la API
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

  // Cambiar vista
  cambiarVista() {
    if (this.vistaActual === 'dia' && this.plan?.plan_detallado) {
      this.cargarDiaSeleccionado();
    }
  }

  // Cargar día seleccionado
  cargarDiaSeleccionado() {
    if (!this.plan?.plan_detallado) return;
    this.diaSeleccionado = this.plan.plan_detallado.weekly.days.find(
      (d: any) => d.date === this.fechaSeleccionada.split('T')[0]
    ) || null;
  }

  // Icono del día
  getDayIcon(dayName: string): string {
    const name = (dayName || '').toLowerCase();
    if (name.includes('lun')) return 'planet-outline';
    if (name.includes('mar')) return 'cloud-outline';
    if (name.includes('mié') || name.includes('mie')) return 'sunny-outline';
    if (name.includes('jue')) return 'partly-sunny-outline';
    if (name.includes('vie')) return 'cloudy-outline';
    if (name.includes('sáb') || name.includes('sab')) return 'thunderstorm-outline';
    if (name.includes('dom')) return 'sunny-outline';
    return 'calendar-outline';
  }

  // Icono de la comida
  getMealIcon(mealType: string): string {
    const icons: Record<string, string> = {
      desayuno: 'sunny-outline',
      media_manana: 'cafe-outline',
      almuerzo: 'restaurant-outline',
      media_tarde: 'ice-cream-outline',
      cena: 'moon-outline',
      colacion: 'moon-outline'
    };
    return icons[mealType] || 'restaurant-outline';
  }

  // Label de la comida
  getMealLabel(mealType: string): string {
    const labels: Record<string, string> = {
      desayuno: 'Desayuno',
      media_manana: 'Media Mañana',
      almuerzo: 'Almuerzo',
      media_tarde: 'Media Tarde',
      cena: 'Cena',
      colacion: 'Colación'
    };
    return labels[mealType] || mealType;
  }

  // Color del chip de calorías
  getMealChipColor(calories: number, dailyTotal: number): string {
    const ratio = dailyTotal > 0 ? calories / dailyTotal : 0;
    if (ratio > 0.4) return 'danger';
    if (ratio > 0.3) return 'warning';
    return 'success';
  }

  // Verificar si es hoy
  isToday(week: number, day: number): boolean {
    if (!this.plan?.plan_detallado) return false;
    const today = new Date();
    const planStart = new Date(this.plan.plan_detallado.weekly.start_date);
    const targetDate = new Date(planStart);
    targetDate.setDate(planStart.getDate() + (week - 1) * 7 + (day - 1));
    return targetDate.toDateString() === today.toDateString();
  }

  // Imprimir plan
  async imprimirPlan() {
    window.print();
    await this.showToast('Abriendo vista de impresión...', 'primary');
  }

  // Compartir plan
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

  // Compartir por app
  private async compartirPorApp(app: 'whatsapp' | 'email') {
    if (!this.plan || !this.paciente) return;
    const message = `Tu Plan Alimenticio Personalizado\n\nPaciente: ${this.paciente.nombre}\nPerfil: ${this.plan.perfil_recomendado}\nCalorías diarias: ${this.plan.plan_detallado?.weekly?.days?.[0]?.daily_totals?.calories || 0} kcal\n\nSemana del ${this.plan.plan_detallado?.weekly?.start_date} al ${this.plan.plan_detallado?.weekly?.end_date}\n\nRecomendación: "${this.plan.recomendaciones}"`;
    
    if (app === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.location.href = `mailto:?subject=Tu Plan Alimenticio&body=${encodeURIComponent(message)}`;
    }
    await this.showToast('Plan compartido', 'success');
  }

  // Descargar PDF
  async descargarPDF() {
    await this.showToast('Generando PDF... (Funcionalidad en desarrollo)', 'primary');
  }

  // Volver
  volver() {
    this.router.navigate(['/medicoverpacientes']);
  }

  // Sidebar
  toggleSidebar() { 
    this.sidebarOpen = !this.sidebarOpen; 
  }

  toggleSubmenu(item: string) { 
    this.submenuAbierto = this.submenuAbierto === item ? null : item; 
  }

  // Navegación
  navegarA(ruta: string): void {
    this.sidebarOpen = false;
    this.submenuAbierto = null;

    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'medico-agregar-paciente': '/medico-agregar-paciente',
      'medico-buscar-paciente': '/medico-buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'medicoinformes': '/medicoinformes',
      'medico-configuracion': '/medico-configuracion'
    };

    const destino = rutas[ruta] || '/medico';
    this.router.navigate([destino]);
  }

  // Refrescar datos
  async refrescarDatos(): Promise<void> {
    if (this.planId) {
      await this.inicializarPlan();
      await this.showToast('Datos actualizados', 'success');
    }
  }

  // Cerrar sesión
  async cerrarSesion(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-button-cancel' },
        {
          text: 'Salir',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            await this.showToast('Sesión cerrada exitosamente', 'success');
            this.router.navigate(['/principal'], { replaceUrl: true });
          }
        }
      ],
      cssClass: 'alert-logout'
    });
    await alert.present();
  }

  // Toast
  async showToast(message: string, color: 'primary' | 'success' | 'danger' | 'warning' = 'primary', duration: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-item-with-submenu')) {
      this.submenuAbierto = null;
    }
  }
}