import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastController, LoadingController, AlertController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-config-general',
  templateUrl: './admin-config-general.page.html',
  styleUrls: ['./admin-config-general.page.scss'],
  standalone: false,
})
export class AdminConfigGeneralPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'configuracion';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Estado
  cargando = false;
  guardando = false;

  config: any = {
    nombre_sistema: 'NutriPA',
    version: '1.0.0',
    descripcion: 'Sistema Clinico Nutricional con IA',
    email_contacto: '',
    telefono_contacto: '',
    direccion: '',
    max_intentos_login: 5,
    tiempo_sesion_minutos: 30,
    permitir_autoregistro: true,
    requerir_aprobacion_admin: false,
    modo_mantenimiento: false
  };

  configPorDefecto: any = {
    nombre_sistema: 'NutriPA',
    version: '1.0.0',
    descripcion: 'Sistema Clinico Nutricional con IA',
    email_contacto: '',
    telefono_contacto: '',
    direccion: '',
    max_intentos_login: 5,
    tiempo_sesion_minutos: 30,
    permitir_autoregistro: true,
    requerir_aprobacion_admin: false,
    modo_mantenimiento: false
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
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
    this.cargarConfiguracion();
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

  async cargarConfiguracion() {
    this.cargando = true;
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/configuracion/parametros`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false && response.parametros) {
        response.parametros.forEach((p: any) => {
          if (p.clave in this.config) {
            const valorActual = this.config[p.clave];
            
            if (typeof valorActual === 'boolean') {
              this.config[p.clave] = p.valor === 'true' || p.valor === '1';
            } else if (typeof valorActual === 'number') {
              this.config[p.clave] = parseInt(p.valor);
            } else {
              this.config[p.clave] = p.valor;
            }
          }
        });
        console.log('Configuracion cargada');
      }
    } catch (error) {
      console.error('Error cargando configuracion:', error);
      await this.showToast('Error al cargar la configuracion', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async guardarConfiguracion() {
    this.guardando = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    try {
      const claves = Object.keys(this.config);
      for (const clave of claves) {
        await this.http.put(
          `${environment.apiUrl}/nutricionapp-api/admin/configuracion/parametros/${clave}`,
          { valor: String(this.config[clave]), descripcion: clave },
          { headers }
        ).toPromise();
      }

      await this.showToast('Configuracion guardada correctamente', 'success');
    } catch (error) {
      console.error('Error guardando:', error);
      await this.showToast('Error al guardar la configuracion', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  async confirmarReset() {
    const alert = await this.alertCtrl.create({
      header: 'Resetear Configuracion',
      message: 'Desea restaurar todos los valores por defecto? Esta accion no guardara los cambios hasta que presione Guardar.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Resetear',
          cssClass: 'alert-button-danger',
          handler: () => {
            this.config = { ...this.configPorDefecto };
            this.showToast('Valores reseteados. Recuerda guardar.', 'warning');
          }
        }
      ]
    });
    await alert.present();
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