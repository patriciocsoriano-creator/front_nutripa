import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { LoadingController, ToastController, AlertController, Platform } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface ActividadReciente {
  tipo: 'login' | 'user' | 'plan' | 'alert' | 'registro' | 'error';
  icono: string;
  descripcion: string;
  tiempo: string;
  usuario_nombre?: string;
  ip_address?: string;
}

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

  //  Estadísticas del dashboard
  stats = {
    totalUsuarios: 0,
    totalMedicos: 0,
    totalPacientes: 0,
    totalPlanes: 0,
    registrosHoy: 0
  };

  //  Actividad reciente (desde backend)
  actividadesRecientes: ActividadReciente[] = [];
  cargandoActividad = false;

  // Reportes globales
  reportesGlobales = {
    pacientesPorMes: [] as any[],
    registrosPorEstado: [] as any[],
    planesPorPerfil: [] as any[],
    topMedicos: [] as any[]
  };

  

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
    await this.cargarEstadisticas();
    await this.cargarActividadReciente();
    await this.cargarReportesGlobales()
   

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

  //  Cargar datos del administrador desde localStorage
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

  //  Cargar estadísticas del dashboard
  private async cargarEstadisticas() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('⚠️ No hay token, redirigiendo a login');
    this.router.navigate(['/principal']);
    return;
  }

  try {
    const response = await this.http.get<any>(
      `${environment.apiUrl}/nutricionapp-api/admin/dashboard/stats`,
      {
        headers: new HttpHeaders({
          'Authorization': `Bearer ${token}`
        })
      }
    ).toPromise();

    console.log(' Respuesta completa del backend:', response);

    if (response && !response.error) {
      // Forzar actualización creando un nuevo objeto
      this.stats = {
        totalUsuarios: response.total_usuarios || 0,
        totalMedicos: response.total_medicos || 0,
        totalPacientes: response.total_pacientes || 0,
        totalPlanes: response.total_planes || 0,
        registrosHoy: response.registros_hoy || 0
      };
      
      console.log(' [ADMIN] Estadísticas actualizadas:', this.stats);
      
      // Forzar detección de cambios
      setTimeout(() => {
        console.log(' Vista actualizada con stats:', this.stats);
      }, 100);
    }
  } catch (error) {
    console.error(' Error cargando estadísticas:', error);
    await this.showToast('Error al cargar estadísticas', 'danger');
  }
}

  //  Cargar actividad reciente desde auditoría
  private async cargarActividadReciente() {
    this.cargandoActividad = true;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await this.http.get<any>(
        `${environment.apiUrl}/nutricionapp-api/admin/auditoria`,
        {
          headers: new HttpHeaders({
            'Authorization': `Bearer ${token}`
          })
        }
      ).toPromise();

      if (response && !response.error && response.logs) {
        this.actividadesRecientes = response.logs.slice(0, 10).map((log: any) => ({
          tipo: this.mapearTipoActividad(log.tipo),
          icono: this.obtenerIcono(log.tipo),
          descripcion: log.descripcion || 'Actividad del sistema',
          tiempo: this.formatearTiempo(log.fecha),
          usuario_nombre: log.usuario_nombre,
          ip_address: log.ip_address
        }));
        console.log(' [ADMIN] Actividad reciente cargada:', this.actividadesRecientes.length, 'registros');
      }
    } catch (error) {
      console.error(' Error cargando actividad:', error);
      // Datos de ejemplo si falla
      this.actividadesRecientes = [
        {
          tipo: 'alert',
          icono: 'warning-outline',
          descripcion: 'No se pudo cargar la actividad del sistema',
          tiempo: 'Ahora'
        }
      ];
    } finally {
      this.cargandoActividad = false;
    }
  }

  //  Cargar reportes globales
  private async cargarReportesGlobales() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await this.http.get<any>(
        `${environment.apiUrl}/nutricionapp-api/admin/reportes/globales`,
        {
          headers: new HttpHeaders({
            'Authorization': `Bearer ${token}`
          })
        }
      ).toPromise();

      if (response && !response.error) {
        this.reportesGlobales = {
          pacientesPorMes: response.pacientes_por_mes || [],
          registrosPorEstado: response.registros_por_estado || [],
          planesPorPerfil: response.planes_por_perfil || [],
          topMedicos: response.top_medicos || []
        };
        console.log(' [ADMIN] Reportes globales cargados');
      }
    } catch (error) {
      console.error(' Error cargando reportes:', error);
    }
  }


  //  Mapear tipo de actividad
  private mapearTipoActividad(tipo: string): 'login' | 'user' | 'plan' | 'alert' | 'registro' | 'error' {
    const mapeo: Record<string, any> = {
      'login': 'login',
      'user': 'user',
      'plan': 'plan',
      'registro': 'registro',
      'error': 'error',
      'alert': 'alert'
    };
    return mapeo[tipo] || 'user';
  }

  //  Obtener icono según tipo
  private obtenerIcono(tipo: string): string {
    const iconos: Record<string, string> = {
      'login': 'log-in-outline',
      'user': 'person-outline',
      'plan': 'nutrition-outline',
      'registro': 'document-text-outline',
      'error': 'alert-circle-outline',
      'alert': 'warning-outline'
    };
    return iconos[tipo] || 'information-circle-outline';
  }

  //  Formatear tiempo relativo
  private formatearTiempo(fecha: string): string {
    if (!fecha) return 'Ahora';
    
    const ahora = new Date();
    const fechaActividad = new Date(fecha);
    const diffMs = ahora.getTime() - fechaActividad.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    return fechaActividad.toLocaleDateString('es-EC');
  }

  //  Refrescar todos los datos
  async refrescarDatos() {
    const loading = await this.loadingCtrl.create({
      message: 'Actualizando datos...',
      spinner: 'crescent'
    });
    await loading.present();

    await Promise.all([
      this.cargarEstadisticas(),
      this.cargarActividadReciente(),
      this.cargarReportesGlobales()
     
    ]);

    await loading.dismiss();
    await this.showToast(' Datos actualizados', 'success');
  }

  // 🚪 Cerrar sesión
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

  //  Toggle sidebar
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  //  Toggle submenú
  toggleSubmenu(item: string) {
    this.submenuAbierto = this.submenuAbierto === item ? null : item;
  }

  //  Navegar a página
  navegarA(ruta: string): void {
  const rutas: Record<string, string> = {
    'admin-inicio': '/administrador',
    'admin-ver-usuarios': '/admin-ver-usuarios',
    'admin-agregar-usuario': '/admin-ver-usuarios',
    'admin-roles-permisos': '/admin-ver-usuarios',
    'admin-ver-medicos': '/admin-ver-medicos',
    'admin-agregar-medico': '/admin-agregar-medico',
    'admin-asignaciones': '/admin-asignaciones',
    'admin-ver-pacientes': '/admin-ver-pacientes',
    'admin-estadisticas-pacientes': '/admin-ver-pacientes',
    'admin-reportes-globales': '/admin-auditoria',
    'admin-auditoria': '/admin-auditoria',
    'admin-actividad-usuarios': '/admin-auditoria',
    'admin-config-general': '/admin-config-general',
    'admin-config-parametros': '/admin-config-parametros',
    'admin-config-backup': '/admin-config-backup'
  };

  this.rutaActual = ruta;
  const rutaDestino = rutas[ruta] || `/${ruta}`;
  
  if (this.isMobile) {
    this.sidebarOpen = false;
  }
  
  this.router.navigate([rutaDestino]);
}

  //  Mostrar toast
  async showToast(message: string, color: 'primary' | 'success' | 'danger' | 'warning' = 'primary') {
    await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'bottom'
    }).then(t => t.present());
  }
}