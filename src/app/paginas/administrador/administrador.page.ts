import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { LoadingController, ToastController, AlertController, Platform } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface ActividadReciente {
  tipo: 'login' | 'user' | 'plan' | 'alert';
  icono: string;
  descripcion: string;
  tiempo: string;
}

// ========================================
// 🎯 COMPONENTE PRINCIPAL
// ========================================

@Component({
  selector: 'app-administrador',
  templateUrl: './administrador.page.html',          
  styleUrls: ['./administrador.page.scss'],
  standalone: false,
})

export class AdministradorPage implements OnInit, OnDestroy {

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  rutaActual: string = 'admin-inicio';
  
  private destroy$ = new Subject<void>();
  private isMobile = false;

  stats = {
    totalUsuarios: 0,
    totalMedicos: 0,
    totalPacientes: 0,
    totalPlanes: 0
  };

  actividadesRecientes: ActividadReciente[] = [];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private platform: Platform,
    private http: HttpClient
  ) {
    this.platform.ready().then(() => {
      this.isMobile = this.platform.is('mobile') || this.platform.width() <= 1024;
      if (!this.isMobile) {
        this.sidebarOpen = true;
      }
    });
  }

  async ngOnInit() {
    this.cargarDatosAdmin();
    this.cargarEstadisticas();
    this.cargarActividadesRecientes();

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

  private cargarDatosAdmin() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreAdmin = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Administrador';
        this.rol = user.rol === 'admin' ? 'Administrador General' : 'Administrador';
      } catch (e) {
        console.warn('⚠️ Error parseando usuario');
      }
    }
  }

  private async cargarEstadisticas() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await this.http.get<any>(
        `${environment.apiUrl}/nutricionapp-api/admin/dashboard/stats`,
        {
          headers: new HttpHeaders({
            'Authorization': `Bearer ${token}`
          })
        }
      ).toPromise();

      if (response && !response.error) {
        this.stats = {
          totalUsuarios: response.total_usuarios || 0,
          totalMedicos: response.total_medicos || 0,
          totalPacientes: response.total_pacientes || 0,
          totalPlanes: response.total_planes || 0
        };
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar estadísticas:', error);
      // Valores por defecto para desarrollo
      this.stats = {
        totalUsuarios: 127,
        totalMedicos: 15,
        totalPacientes: 892,
        totalPlanes: 1456
      };
    }
  }

  private cargarActividadesRecientes() {
    // Datos de ejemplo - reemplazar con llamada a backend
    this.actividadesRecientes = [
      {
        tipo: 'user',
        icono: 'person-add-outline',
        descripcion: 'Nuevo médico registrado: Dr. Carlos Mendoza',
        tiempo: 'Hace 5 minutos'
      },
      {
        tipo: 'plan',
        icono: 'nutrition-outline',
        descripcion: 'Plan nutricional generado para paciente Rosalba Chalen',
        tiempo: 'Hace 15 minutos'
      },
      {
        tipo: 'login',
        icono: 'log-in-outline',
        descripcion: 'Inicio de sesión: Dr. Patricia Ordoñez',
        tiempo: 'Hace 30 minutos'
      },
      {
        tipo: 'alert',
        icono: 'warning-outline',
        descripcion: 'Intento de acceso no autorizado detectado',
        tiempo: 'Hace 1 hora'
      },
      {
        tipo: 'user',
        icono: 'create-outline',
        descripcion: 'Perfil actualizado: María González',
        tiempo: 'Hace 2 horas'
      }
    ];
  }

  async refrescarDatos() {
    const loading = await this.loadingCtrl.create({
      message: 'Actualizando datos...',
      spinner: 'crescent'
    });
    await loading.present();

    await this.cargarEstadisticas();
    await this.cargarActividadesRecientes();

    await loading.dismiss();
    await this.showToast('✅ Datos actualizados', 'success');
  }

  async cerrarSesion() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, cerrar',
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

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(item: string) {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'admin-inicio': '/admin-inicio',
      'admin-ver-usuarios': '/admin/usuarios',
      'admin-agregar-usuario': '/admin/usuarios/nuevo',
      'admin-roles-permisos': '/admin/roles',
      'admin-ver-medicos': '/admin/medicos',
      'admin-agregar-medico': '/admin/medicos/nuevo',
      'admin-asignaciones': '/admin/asignaciones',
      'admin-ver-pacientes': '/admin/pacientes',
      'admin-estadisticas-pacientes': '/admin/pacientes/estadisticas',
      'admin-reportes-globales': '/admin/reportes',
      'admin-auditoria': '/admin/auditoria',
      'admin-actividad-usuarios': '/admin/actividad',
      'admin-config-general': '/admin/configuracion',
      'admin-config-parametros': '/admin/configuracion/parametros',
      'admin-config-backup': '/admin/configuracion/backup'
    };

    this.rutaActual = ruta;
    const rutaDestino = rutas[ruta] || `/${ruta}`;
    this.router.navigate([rutaDestino]);
  }

  async showToast(message: string, color: 'primary' | 'success' | 'danger' | 'warning' = 'primary') {
    await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'bottom'
    }).then(t => t.present());
  }

}