import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pacienteverplan',
  templateUrl: './pacienteverplan.page.html',
  styleUrls: ['./pacienteverplan.page.scss'],
  standalone: false,
})
export class PacienteverplanPage implements OnInit {

  //  UI State
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombrePaciente: string = '';
  isMobile = false;
  
  //  Plan
  plan: any = null;
  cargando = true;
  
  //  Vista
  vistaActual: 'semana' | 'dia' | 'mes' = 'semana';
  fechaSeleccionada: string = '';
  diaSeleccionado: any = null;

  //  Datos adicionales
  ultimoRegistro: any = null;
  proximaCita: any = null;
  diasParaCita: number = 0;  //  PROPIEDAD AGREGADA

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.detectMobile();
    this.cargarDatosUsuario();
    await this.cargarDatos();
  }

  private detectMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.detectMobile();
  }

  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombrePaciente = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Paciente';
      } catch (e) {
        console.warn('⚠️ Error parseando usuario');
      }
    }
  }

  //  Cargar todos los datos en paralelo
  async cargarDatos(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      const baseUrl = `${environment.apiUrl}/nutricionapp-api/paciente/plan`;

      // Cargar en paralelo los 3 endpoints
      const [planResp, registroResp, citaResp] = await Promise.all([
        this.http.get<any>(`${baseUrl}/plan-activo`, { headers }).toPromise().catch(() => null),
        this.http.get<any>(`${baseUrl}/ultimo-registro`, { headers }).toPromise().catch(() => null),
        this.http.get<any>(`${baseUrl}/proxima-cita`, { headers }).toPromise().catch(() => null)
      ]);

      console.log(' Respuesta plan:', planResp);
      console.log(' Respuesta registro:', registroResp);
      console.log(' Respuesta cita:', citaResp);

      // Asignar plan
      if (planResp?.plan) {
        this.plan = planResp.plan;
        
        // Inicializar fecha seleccionada con el primer día
        if (this.plan?.plan_detallado?.weekly?.days?.length > 0) {
          this.fechaSeleccionada = this.plan.plan_detallado.weekly.days[0].date;
          this.diaSeleccionado = this.plan.plan_detallado.weekly.days[0];
        }
      } else {
        await this.showToast(planResp?.mensaje || 'No tienes un plan activo', 'warning');
      }

      // Asignar último registro
      if (registroResp?.registro) {
        this.ultimoRegistro = registroResp.registro;
      }

      // Asignar próxima cita y calcular días
      if (citaResp?.cita) {
        this.proximaCita = citaResp.cita;
        this.calcularDiasParaCita();  //  Calcular días
      }

    } catch (error: any) {
      console.error(' Error cargando datos:', error);
      await this.showToast('Error al cargar los datos', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  //  MÉTODO AGREGADO: Calcular días para la cita
  private calcularDiasParaCita(): void {
    if (!this.proximaCita?.fecha_hora) {
      this.diasParaCita = 0;
      return;
    }
    
    const fechaCita = new Date(this.proximaCita.fecha_hora);
    const hoy = new Date();
    
    // Resetear horas para comparar solo fechas
    hoy.setHours(0, 0, 0, 0);
    fechaCita.setHours(0, 0, 0, 0);
    
    const diffTime = fechaCita.getTime() - hoy.getTime();
    this.diasParaCita = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log(` Días para la cita: ${this.diasParaCita}`);
  }

  cambiarVista(): void {
    if (this.vistaActual === 'dia' && this.plan?.plan_detallado) {
      this.cargarDiaSeleccionado();
    }
  }

  cargarDiaSeleccionado(): void {
    if (!this.plan?.plan_detallado?.weekly?.days) return;
    
    const fechaStr = this.fechaSeleccionada.split('T')[0];
    this.diaSeleccionado = this.plan.plan_detallado.weekly.days.find(
      (d: any) => d.date === fechaStr
    ) || null;
  }

  //  Helpers de UI
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

  getMealColorClass(mealType: string): string {
    const colors: Record<string, string> = {
      desayuno: 'color-desayuno',
      media_manana: 'media-manana',
      almuerzo: 'color-almuerzo',
      media_tarde: 'media-tarde',
      cena: 'color-cena',
      colacion: 'color-colacion'
    };
    return colors[mealType] || '';
  }

  //  Contactar médico por WhatsApp
  async contactarWhatsApp(): Promise<void> {
    if (!this.plan?.medico_telefono) {
      await this.showToast('No hay teléfono del médico registrado', 'warning');
      return;
    }

    let telefonoLimpio = this.plan.medico_telefono.replace(/[\s\-\(\)]/g, '');
    if (telefonoLimpio.startsWith('0')) {
      telefonoLimpio = telefonoLimpio.substring(1);
    }
    if (!telefonoLimpio.startsWith('593')) {
      telefonoLimpio = '593' + telefonoLimpio;
    }

    const mensaje = `Hola Dr. ${this.plan.medico_nombre}, soy ${this.nombrePaciente}. Le contacto desde la plataforma NutriPa respecto a mi plan nutricional.`;
    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  //  Ver próxima cita
  async verProximaCita(): Promise<void> {
    if (this.proximaCita) {
      const fecha = new Date(this.proximaCita.fecha_hora).toLocaleDateString('es-EC', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const alert = await this.alertCtrl.create({
        header: ' Próxima Cita',
        message: `<strong>${this.proximaCita.medico_nombre}</strong><br>${fecha}<br><br>${this.proximaCita.motivo || ''}`,
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  //  Navegación
  navegarA(ruta: string): void {
    this.sidebarOpen = false;
    const rutas: Record<string, string> = {
      'paciente': '/paciente',
      'pacienteprincipal': '/pacienteprincipal',
      'pacienteverplan': '/pacienteverplan',
      'pacientedatosantropometricos': '/pacientedatosantropometricos',
      'pacienteregistrarglucosa': '/pacienteregistrarglucosa',
      'pacienteregistrarpresion': '/pacienteregistrarpresion',
      'pacientehistorialmedico': '/pacientehistorialmedico',
      'pacientemensajes': '/pacientemensajes',
      'pacienteconfiguracion': '/pacienteconfiguracion'
    };
    const destino = rutas[ruta] || `/${ruta}`;
    this.router.navigate([destino]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string): void {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  async cerrarSesion(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar',
          handler: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/principal'], { replaceUrl: true });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}