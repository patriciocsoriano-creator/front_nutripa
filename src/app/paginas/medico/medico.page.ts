import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

// 👇 Interfaces actualizadas según la BD real
export interface PacienteReciente {
  id: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  cedula: string;
  telefono: string;
  sexo: 'M' | 'F' | 'O';
  edad: number | null;
  actividad_fisica: string;
  total_planes: number;
  ultimo_control: string | null;
  presion_arterial: string | null;
  riesgo: 'bajo' | 'medio' | 'alto' | 'critico';
}

export interface AlertaPaciente {
  paciente_id: string;
  nombre_completo: string;
  presion_arterial: string;
  sistolica: number;
  diastolica: number;
  fecha_registro: string;
  nivel_riesgo: 'alto' | 'crítico';
}

export interface DashboardData {
  totalPacientes: number;
  planesCreados: number;
  controlesRealizados: number;
  alertasActivas: number;
  listaAlertas: AlertaPaciente[];
  pacientesRecientes: PacienteReciente[];
}

@Component({
  selector: 'app-medico',
  templateUrl: './medico.page.html',
  styleUrls: ['./medico.page.scss'],
  standalone: false,
})
export class MedicoPage implements OnInit {

  // 👤 Información del médico
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';
  
  // 📊 Estadísticas del dashboard
  totalPacientes: number = 0;
  planesCreados: number = 0;
  controlesRealizados: number = 0;
  alertasActivas: number = 0;
  listaAlertas: AlertaPaciente[] = [];

  // 📋 Lista de pacientes recientes
  pacientesRecientes: PacienteReciente[] = [];
  
  // ⏳ Estado de carga
  cargando: boolean = true;

  // 🎛️ Estado de la UI
  sidebarOpen: boolean = false;
  submenuAbierto: string | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  async ngOnInit() {
    this.cargarDatosUsuario();
    await this.cargarDatosDashboard();
  }

  // 👤 Cargar datos del usuario logueado
  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Médico Especialista' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Especialista';
      } catch (e) { 
        console.warn('⚠️ Error parseando usuario'); 
      }
    }
  }

  // 🔄 Cargar estadísticas REALES desde la API
  async cargarDatosDashboard(): Promise<void> {
    this.cargando = true;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const headers = new HttpHeaders({ 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/dashboard`,
        { headers }
      ).toPromise();

      if (response?.error) {
        throw new Error(response.mensaje);
      }

      const data: DashboardData = response.dashboard;

      // Asignar estadísticas
      this.totalPacientes = data.totalPacientes;
      this.planesCreados = data.planesCreados;
      this.controlesRealizados = data.controlesRealizados;
      this.alertasActivas = data.alertasActivas;
      this.listaAlertas = data.listaAlertas || [];
      this.pacientesRecientes = data.pacientesRecientes || [];

      console.log('✅ [DASHBOARD] Datos cargados:', data);

    } catch (error: any) {
      console.error('❌ Error cargando dashboard:', error);
      await this.showToast('Error cargando datos del dashboard', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  // 🚨 Ver detalle de alertas
  async verAlertas(): Promise<void> {
    if (this.listaAlertas.length === 0) {
      await this.showToast('✅ No hay alertas activas', 'success');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: `🚨 Alertas Activas (${this.listaAlertas.length})`,
      cssClass: 'alerta-paciente',
      buttons: ['Cerrar'],
      message: `
        <div style="max-height: 400px; overflow-y: auto;">
          ${this.listaAlertas.map(a => `
            <div style="padding: 10px; margin-bottom: 8px; background: ${a.nivel_riesgo === 'crítico' ? '#fee2e2' : '#fef3c7'}; border-radius: 8px; border-left: 4px solid ${a.nivel_riesgo === 'crítico' ? '#dc2626' : '#f59e0b'};">
              <strong style="color: #1a1f36;">${a.nombre_completo}</strong><br>
              <span style="font-size: 0.9rem; color: #6c7293;">
                🩺 PA: <strong style="color: ${a.nivel_riesgo === 'crítico' ? '#dc2626' : '#f59e0b'};">${a.presion_arterial} mmHg</strong><br>
                📅 ${new Date(a.fecha_registro).toLocaleDateString('es-EC')}<br>
                ⚠️ Nivel: <strong>${a.nivel_riesgo.toUpperCase()}</strong>
              </span>
            </div>
          `).join('')}
        </div>
      `
    });
    await alert.present();
  }

  // 👁️ Ver detalle de un paciente
  verDetallePaciente(paciente: PacienteReciente): void {
    this.router.navigate(['/medicoconsultarpaciente', paciente.id]);
  }

  // 🔄 Alternar sidebar
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // 🧭 Navegar a otra página
  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'agregar-paciente': '/agregar-paciente',
      'buscar-paciente': '/buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'reportes': '/reportes-medico',
      'configuracion': '/configuracion-medico'
    };

    const rutaDestino = rutas[ruta] || `/${ruta}`;
    this.router.navigate([rutaDestino]);
  }

  // 🚪 Cerrar sesión
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

  // 🔔 Mostrar toast
  async showToast(message: string, color: 'primary' | 'success' | 'danger' | 'warning' = 'primary', duration: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  // 🎨 Color del badge según riesgo
  getRiesgoColor(riesgo: string): string {
    const colores: Record<string, string> = {
      'bajo': 'success',
      'medio': 'warning',
      'alto': 'danger',
      'critico': 'danger'
    };
    return colores[riesgo] || 'medium';
  }

  // 📅 Formatear fecha
  formatearFecha(fecha?: string): string {
    if (!fecha) return 'Sin registro';
    return new Date(fecha).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // 🔄 Refrescar datos
  async refrescarDatos(event?: any): Promise<void> {
    try {
      await this.cargarDatosDashboard();
      await this.showToast('Datos actualizados', 'success');
    } finally {
      if (event?.target?.complete) {
        event.target.complete();
      }
    }
  }

  // 🔄 Alternar submenú
  toggleSubmenu(nombre: string): void {
    this.submenuAbierto = this.submenuAbierto === nombre ? null : nombre;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-item-with-submenu')) {
      this.submenuAbierto = null;
    }
  }
}