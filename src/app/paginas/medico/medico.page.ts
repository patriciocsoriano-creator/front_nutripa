import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController} from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

// Interfaces actualizadas según la BD real
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

  // Información del médico
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';
  
  // Estadísticas del dashboard
  totalPacientes: number = 0;
  planesCreados: number = 0;
  controlesRealizados: number = 0;
  alertasActivas: number = 0;
  listaAlertas: AlertaPaciente[] = [];

  // Lista de pacientes recientes
  pacientesRecientes: PacienteReciente[] = [];
  
  // Estado de carga
  cargando: boolean = true;

  // Estado de la UI
  sidebarOpen: boolean = false;
  submenuAbierto: string | null = null;

  // Variables de notificaciones y mensajes
  notificacionesSinLeer: number = 0;
  mensajesNoLeidos: number = 0;

  // Sonido de notificación
private audioNotificacion = new Audio('assets/sounds/notificacion.mp3');

// Para detectar si llegaron nuevas notificaciones
private ultimoTotalNotificaciones = 0;
private ultimoTotalMensajes = 0;

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
  await this.cargarNotificaciones(false);

  // Desbloquear audio
  document.addEventListener(
    'click',
    () => {
      this.audioNotificacion.play()
        .then(() => {
          this.audioNotificacion.pause();
          this.audioNotificacion.currentTime = 0;
        })
        .catch(() => {});
    },
    { once: true }
  );
}

  async ionViewWillEnter() {
  await this.cargarNotificaciones(true);
  await this.cargarDatosDashboard();
}

  // Cargar datos del usuario logueado
  private cargarDatosUsuario(): void {
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

  // Cargar estadísticas REALES desde la API
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

      console.log('[DASHBOARD] Datos cargados:', data);

    } catch (error: any) {
      console.error('Error cargando dashboard:', error);
      await this.showToast('Error cargando datos del dashboard', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  // Cargar notificaciones desde API
  private async cargarNotificaciones(reproducirSonido: boolean = false): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const resp: any = await this.http.get(
      `${environment.apiUrl}/nutricionapp-api/medico/notificaciones/no-leidas`,
      { headers }
    ).toPromise();

    const nuevasNotificaciones = resp?.total || 0;
    const nuevosMensajes = resp?.mensajesNoLeidos || 0;

    // Si aumentó el número, reproducir sonido
    if (
      reproducirSonido &&
      (
        nuevasNotificaciones > this.ultimoTotalNotificaciones ||
        nuevosMensajes > this.ultimoTotalMensajes
      )
    ) {
      this.reproducirSonido();
    }

    this.notificacionesSinLeer = nuevasNotificaciones;
    this.mensajesNoLeidos = nuevosMensajes;

    this.ultimoTotalNotificaciones = nuevasNotificaciones;
    this.ultimoTotalMensajes = nuevosMensajes;

  } catch (error) {
    console.warn('No se pudieron cargar notificaciones');
  }
}

private reproducirSonido(): void {
  this.audioNotificacion.currentTime = 0;

  this.audioNotificacion.play().catch(err => {
    console.warn('No se pudo reproducir el sonido:', err);
  });
}

  // Ver detalle de alertas
  async verAlertas(): Promise<void> {
    if (this.listaAlertas.length === 0) {
      await this.showToast('No hay alertas activas', 'success');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: `Alertas Activas (${this.listaAlertas.length})`,
      cssClass: 'alerta-paciente',
      buttons: ['Cerrar'],
      message: `
        <div style="max-height: 400px; overflow-y: auto;">
          ${this.listaAlertas.map(a => `
            <div style="padding: 10px; margin-bottom: 8px; background: ${a.nivel_riesgo === 'crítico' ? '#fee2e2' : '#fef3c7'}; border-radius: 8px; border-left: 4px solid ${a.nivel_riesgo === 'crítico' ? '#dc2626' : '#f59e0b'};">
              <strong style="color: #1a1f36;">${a.nombre_completo}</strong><br>
              <span style="font-size: 0.9rem; color: #6c7293;">
                PA: <strong style="color: ${a.nivel_riesgo === 'crítico' ? '#dc2626' : '#f59e0b'};">${a.presion_arterial} mmHg</strong><br>
                ${new Date(a.fecha_registro).toLocaleDateString('es-EC')}<br>
                Nivel: <strong>${a.nivel_riesgo.toUpperCase()}</strong>
              </span>
            </div>
          `).join('')}
        </div>
      `
    });
    await alert.present();
  }

  // Ver notificaciones
  async verNotificaciones(): Promise<void> {
  this.router.navigate(['/mediconotificaciones']);
}

  // Marcar todas las notificaciones como leídas
  async marcarTodasComoLeidas(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      await this.http.put(
        `${environment.apiUrl}/nutricionapp-api/medico/notificaciones/leer-todas`,
        {},
        { headers }
      ).toPromise();

      this.notificacionesSinLeer = 0;
      await this.showToast('Todas las notificaciones marcadas como leidas', 'success');

    } catch (error) {
      console.error('Error marcando notificaciones:', error);
      await this.showToast('Error al marcar notificaciones', 'danger');
    }
  }

  // Ver mensajes
  async verMensajes(): Promise<void> {
    this.router.navigate(['/medicomensajes']);
  }

  // Ver detalle de un paciente
  verDetallePaciente(paciente: PacienteReciente): void {
    this.router.navigate(['/medicoconsultarpaciente', paciente.id]);
  }

  // Alternar sidebar
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // Navegar a otra página
  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'medico-agregar-paciente': '/medico-agregar-paciente',
      'medico-buscar-paciente': '/medico-buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'medicoinformes': '/medico-informes',
      'medicomensajes': '/medicomensajes',
      'mediconotificaciones': '/mediconotificaciones',
      'medico-configuracion': '/medico-configuracion'
    };
    this.router.navigate([rutas[ruta] || `/${ruta}`]);
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

  // Mostrar toast
  async showToast(message: string, color: 'primary' | 'success' | 'danger' | 'warning' = 'primary', duration: number = 2500): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  // Color del badge según riesgo
  getRiesgoColor(riesgo: string): string {
    const colores: Record<string, string> = {
      'bajo': 'success',
      'medio': 'warning',
      'alto': 'danger',
      'critico': 'danger'
    };
    return colores[riesgo] || 'medium';
  }

  // Formatear fecha
  formatearFecha(fecha?: string): string {
    if (!fecha) return 'Sin registro';
    return new Date(fecha).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // Refrescar datos
  async refrescarDatos(): Promise<void> {
    this.cargando = true;
    await this.cargarDatosDashboard();
    await this.cargarNotificaciones();
    await this.showToast('Datos actualizados', 'success');
  }

  // Alternar submenú
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