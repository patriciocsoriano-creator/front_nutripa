import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastController, AlertController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-config-backup',
  templateUrl: './admin-config-backup.page.html',
  styleUrls: ['./admin-config-backup.page.scss'],
  standalone: false,
})
export class AdminConfigBackupPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'configuracion';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Datos
  tablas: any[] = [];
  cargando = false;
  totalTablas = 0;
  tamanioTotal = 0;
  fechaBackup = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      if (!this.isMobile) {
        this.sidebarOpen = true;
      }
    });
  }

  ngOnInit() {
    this.cargarDatosAdmin();
    this.cargarInfoBackup();
  }

  private cargarDatosAdmin() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreAdmin = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Administrador';
        this.rol = user.rol === 'admin' ? 'Administrador General' : 'Administrador';
      } catch (e) {
        console.warn('Error parseando usuario');
      }
    }
  }

  async cargarInfoBackup() {
    this.cargando = true;
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/configuracion/backup`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        this.tablas = response.tablas || [];
        this.totalTablas = response.total_tablas || 0;
        this.fechaBackup = response.fecha_backup || '';
        this.tamanioTotal = this.tablas.reduce((sum: number, t: any) => sum + (t.tamanio_mb || 0), 0);
        console.log('Informacion de backup cargada:', this.totalTablas, 'tablas');
      }
    } catch (error) {
      console.error('Error cargando backup:', error);
      await this.showToast('Error al cargar informacion', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async confirmarExportar() {
    const alert = await this.alertCtrl.create({
      header: 'Exportar Base de Datos',
      message: 'Desea exportar toda la base de datos en formato SQL?<br><br><em>Se descargara un archivo .sql con toda la estructura y datos.</em>',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Exportar',
          handler: () => this.exportarBD()
        }
      ]
    });
    await alert.present();
  }

  exportarBD() {
    const token = localStorage.getItem('token');
    window.open(
      `${environment.apiUrl}/nutricionapp-api/admin/configuracion/backup/exportar?token=${token}`,
      '_blank'
    );
    this.showToast('Descarga iniciada', 'success');
  }

  async confirmarImportar() {
    const alert = await this.alertCtrl.create({
      header: 'Importar Base de Datos',
      message: '<strong>ADVERTENCIA</strong><br><br>Importar una base de datos <strong>reemplazara todos los datos actuales</strong>.<br><br>Desea continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Importar',
          cssClass: 'alert-button-danger',
          handler: () => {
            this.showToast('Funcion de importar en desarrollo', 'warning');
          }
        }
      ]
    });
    await alert.present();
  }

  getTamanioColor(tamanio: number): string {
    if (tamanio < 1) return 'success';
    if (tamanio < 10) return 'warning';
    return 'danger';
  }

  // Navegacion
  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'admin-inicio': '/administrador',
      'admin-ver-usuarios': '/admin-ver-usuarios',
      'admin-agregar-usuario': '/admin-agregar-usuario',
      'admin-roles-permisos': '/admin-roles-permisos',
      'admin-ver-medicos': '/admin-ver-medicos',
      'admin-agregar-medico': '/admin-agregar-medico',
      'admin-asignaciones': '/admin-asignaciones',
      'admin-ver-pacientes': '/admin-ver-pacientes',
      'admin-estadisticas-pacientes': '/admin-estadisticas-pacientes',
      'admin-reportes-globales': '/admin-reportes-globales',
      'admin-auditoria': '/admin-auditoria',
      'admin-actividad-usuarios': '/admin-actividad-usuarios',
      'admin-config-general': '/admin-config-general',
      'admin-config-parametros': '/admin-config-parametros',
      'admin-config-backup': '/admin-config-backup'
    };

    const rutaDestino = rutas[ruta] || `/${ruta}`;
    
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
    
    this.router.navigate([rutaDestino]);
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string) {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  async cerrarSesion() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesion',
      message: 'Esta seguro que desea cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Si, cerrar',
          cssClass: 'alert-button-danger',
          handler: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/principal']);
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}