import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-auditoria',
  templateUrl: './admin-auditoria.page.html',
  styleUrls: ['./admin-auditoria.page.scss'],
  standalone: false,
})
export class AdminAuditoriaPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'reportes';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Logs
  logs: any[] = [];
  cargando = false;
  filtroTipo = 'todos';
  terminoBusqueda = '';

  // Contadores
  totalLogins = 0;
  totalUsuarios = 0;
  totalRegistros = 0;
  totalErrores = 0;

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
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
    this.cargarLogs();
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

  async cargarLogs() {
    this.cargando = true;
    const token = localStorage.getItem('token');
    
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/auditoria`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();
      
      this.logs = response?.logs || [];
      this.calcularContadores();
      console.log('Logs cargados:', this.logs.length);
    } catch (error) {
      console.error('Error cargando logs:', error);
      await this.showToast('Error al cargar registros', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  private calcularContadores() {
    this.totalLogins = this.logs.filter(l => l.tipo === 'login').length;
    this.totalUsuarios = this.logs.filter(l => l.tipo === 'user').length;
    this.totalRegistros = this.logs.filter(l => l.tipo === 'registro').length;
    this.totalErrores = this.logs.filter(l => l.tipo === 'error').length;
  }

  get logsFiltrados() {
    let result = [...this.logs];
    
    if (this.filtroTipo !== 'todos') {
      result = result.filter(l => l.tipo === this.filtroTipo);
    }
    
    if (this.terminoBusqueda) {
      const t = this.terminoBusqueda.toLowerCase();
      result = result.filter(l => 
        l.descripcion?.toLowerCase().includes(t) ||
        l.usuario_nombre?.toLowerCase().includes(t) ||
        l.ip_address?.toLowerCase().includes(t)
      );
    }
    
    return result;
  }

  limpiarFiltros() {
    this.filtroTipo = 'todos';
    this.terminoBusqueda = '';
  }

  getIconoTipo(tipo: string): string {
    const iconos: Record<string, string> = {
      'login': 'log-in-outline',
      'user': 'person-outline',
      'registro': 'document-text-outline',
      'error': 'alert-circle-outline',
      'plan': 'nutrition-outline'
    };
    return iconos[tipo] || 'information-circle-outline';
  }

  getColorTipo(tipo: string): string {
    const colores: Record<string, string> = {
      'login': 'primary',
      'user': 'success',
      'registro': 'secondary',
      'error': 'danger',
      'plan': 'warning'
    };
    return colores[tipo] || 'medium';
  }

  getNombreTipo(tipo: string): string {
    const nombres: Record<string, string> = {
      'login': 'Login',
      'user': 'Usuario',
      'registro': 'Registro',
      'error': 'Error',
      'plan': 'Plan'
    };
    return nombres[tipo] || tipo;
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