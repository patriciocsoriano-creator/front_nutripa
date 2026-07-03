import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
  cita_id: string | null;
  nombre_paciente: string;
  cedula_paciente: string;
}

@Component({
  selector: 'app-mediconotificaciones',
  templateUrl: './mediconotificaciones.page.html',
  styleUrls: ['./mediconotificaciones.page.scss'],
  standalone: false,
})
export class MedicoNotificacionesPage implements OnInit {

  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';
  
  cargando: boolean = true;
  sidebarOpen: boolean = false;
  submenuAbierto: string | null = null;
  
  notificaciones: Notificacion[] = [];
  totalNoLeidas: number = 0;
  
  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { }

  async ngOnInit() {
    this.cargarDatosUsuario();
    await this.cargarNotificaciones();
  }

  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Medico Especialista' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Especialista';
      } catch (e) { 
        console.warn('Error parseando usuario'); 
      }
    }
  }

  async cargarNotificaciones(): Promise<void> {
    this.cargando = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticacion');

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/notificaciones`,
        { headers }
      ).toPromise();

      this.notificaciones = resp?.notificaciones || [];
      this.totalNoLeidas = resp?.totalNoLeidas || 0;

    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      await this.mostrarToast('Error al cargar notificaciones', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async marcarComoLeida(notificacion: Notificacion): Promise<void> {
    if (notificacion.leida) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      await this.http.put(
        `${environment.apiUrl}/nutricionapp-api/medico/notificaciones/${notificacion.id}/leida`,
        {},
        { headers }
      ).toPromise();

      notificacion.leida = true;
      this.totalNoLeidas = Math.max(0, this.totalNoLeidas - 1);

    } catch (error) {
      console.error('Error marcando como leida:', error);
    }
  }

  async marcarTodasComoLeidas(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar',
      message: '¿Deseas marcar todas las notificaciones como leidas?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: async () => {
            try {
              const token = localStorage.getItem('token');
              const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

              await this.http.put(
                `${environment.apiUrl}/nutricionapp-api/medico/notificaciones/leer-todas`,
                {},
                { headers }
              ).toPromise();

              this.notificaciones.forEach(n => n.leida = true);
              this.totalNoLeidas = 0;
              await this.mostrarToast('Todas las notificaciones marcadas como leidas', 'success');

            } catch (error) {
              console.error('Error:', error);
              await this.mostrarToast('Error al marcar notificaciones', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  verDetallePaciente(notificacion: Notificacion): void {
    this.marcarComoLeida(notificacion);
    this.router.navigate(['/medicoconsultarpaciente'], {
      queryParams: { cedula: notificacion.cedula_paciente }
    });
  }

  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'medico-agregar-paciente': '/medico-agregar-paciente',
      'medico-buscar-paciente': '/medico-buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'medicoinformes': '/medicoinformes',
      'medicomensajes': '/medicomensajes',
      'mediconotificaciones': '/mediconotificaciones',
      'medico-configuracion': '/medico-configuracion'
    };
    this.router.navigate([rutas[ruta] || `/${ruta}`]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(nombre: string): void {
    this.submenuAbierto = this.submenuAbierto === nombre ? null : nombre;
  }

  async cerrarSesion(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesion',
      message: '¿Estas seguro de que deseas cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salir',
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

  async refrescarDatos(): Promise<void> {
    await this.cargarNotificaciones();
    await this.mostrarToast('Datos actualizados', 'success');
  }

  async mostrarToast(message: string, color: 'primary' | 'success' | 'danger' | 'warning' = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  getIconoTipo(tipo: string): string {
    const iconos: Record<string, string> = {
      'confirmacion_cita': 'checkmark-circle',
      'cancelacion_cita': 'close-circle',
      'mensaje_nuevo': 'chatbubble',
      'alerta_glucosa': 'warning'
    };
    return iconos[tipo] || 'notifications';
  }

  getColorTipo(tipo: string): string {
    const colores: Record<string, string> = {
      'confirmacion_cita': 'success',
      'cancelacion_cita': 'danger',
      'mensaje_nuevo': 'primary',
      'alerta_glucosa': 'warning'
    };
    return colores[tipo] || 'medium';
  }

  formatearFecha(fecha: string): string {
    const d = new Date(fecha);
    const ahora = new Date();
    const diffMin = Math.floor((ahora.getTime() - d.getTime()) / 60000);
    
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffMin < 1440) return `Hace ${Math.floor(diffMin / 60)} h`;
    return d.toLocaleDateString('es-EC', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}