import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-actividad-usuarios',
  templateUrl: './admin-actividad-usuarios.page.html',
  styleUrls: ['./admin-actividad-usuarios.page.scss'],
  standalone: false,
})
export class AdminActividadUsuariosPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'reportes';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Datos
  usuarios: any[] = [];
  cargando = false;
  terminoBusqueda = '';
  filtroRol = 'todos';
  filtroEstado = 'todos';
  ordenPor: 'actividad' | 'registros' | 'nombre' | 'fecha' = 'actividad';

  // KPIs
  totalActivos = 0;
  totalInactivos = 0;
  totalRegistros = 0;

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
    this.cargarActividad();
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

  async cargarActividad() {
    this.cargando = true;
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/actividad`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        this.usuarios = response.actividad || [];
        this.calcularKpis();
        console.log('Actividad cargada:', this.usuarios.length, 'usuarios');
      } else {
        await this.showToast('Error al cargar actividad', 'danger');
      }
    } catch (error) {
      console.error('Error cargando actividad:', error);
      await this.showToast('Error al cargar actividad de usuarios', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  private calcularKpis() {
    this.totalActivos = this.usuarios.filter(u => u.activo === 1).length;
    this.totalInactivos = this.usuarios.length - this.totalActivos;
    this.totalRegistros = this.usuarios.reduce((sum, u) => sum + (u.registros_realizados || 0), 0);
  }

  get usuariosFiltrados() {
    let result = [...this.usuarios];

    // Filtro por busqueda
    if (this.terminoBusqueda) {
      const t = this.terminoBusqueda.toLowerCase();
      result = result.filter(u => 
        u.nombre?.toLowerCase().includes(t)
      );
    }

    // Filtro por rol
    if (this.filtroRol !== 'todos') {
      result = result.filter(u => u.rol === this.filtroRol);
    }

    // Filtro por estado
    if (this.filtroEstado === 'activos') {
      result = result.filter(u => u.activo === 1);
    } else if (this.filtroEstado === 'inactivos') {
      result = result.filter(u => u.activo !== 1);
    }

    // Ordenamiento
    result = this.ordenarUsuarios(result);

    return result;
  }

  private ordenarUsuarios(lista: any[]): any[] {
    switch (this.ordenPor) {
      case 'actividad':
        return lista.sort((a, b) => {
          const fechaA = a.ultima_actividad ? new Date(a.ultima_actividad).getTime() : 0;
          const fechaB = b.ultima_actividad ? new Date(b.ultima_actividad).getTime() : 0;
          return fechaB - fechaA;
        });
      case 'registros':
        return lista.sort((a, b) => 
          (b.registros_realizados || 0) - (a.registros_realizados || 0)
        );
      case 'nombre':
        return lista.sort((a, b) => 
          (a.nombre || '').localeCompare(b.nombre || '')
        );
      case 'fecha':
        return lista.sort((a, b) => {
          const fechaA = a.fecha_registro ? new Date(a.fecha_registro).getTime() : 0;
          const fechaB = b.fecha_registro ? new Date(b.fecha_registro).getTime() : 0;
          return fechaB - fechaA;
        });
      default:
        return lista;
    }
  }

  limpiarFiltros() {
    this.terminoBusqueda = '';
    this.filtroRol = 'todos';
    this.filtroEstado = 'todos';
  }

  getRolLabel(rol: string): string {
    const labels: Record<string, string> = {
      'admin': 'Administrador',
      'doctor': 'Medico',
      'nutricionista': 'Nutricionista',
      'enfermera': 'Enfermera',
      'paciente': 'Paciente'
    };
    return labels[rol] || rol;
  }

  getRolColor(rol: string): string {
    const colores: Record<string, string> = {
      'admin': 'admin',
      'doctor': 'doctor',
      'nutricionista': 'nutri',
      'enfermera': 'enfermera',
      'paciente': 'paciente'
    };
    return colores[rol] || 'default';
  }

  getPorcentajeActividad(registros: number): number {
    if (!registros || registros === 0) return 0;
    // Maximo de referencia: 20 registros
    const maximo = 20;
    return Math.min(Math.round((registros / maximo) * 100), 100);
  }

  getNivelActividad(registros: number): string {
    if (!registros || registros === 0) return 'Sin actividad';
    if (registros <= 3) return 'Baja';
    if (registros <= 10) return 'Media';
    if (registros <= 20) return 'Alta';
    return 'Muy alta';
  }

  getClaseActividad(registros: number): string {
    if (!registros || registros === 0) return 'nivel-nulo';
    if (registros <= 3) return 'nivel-bajo';
    if (registros <= 10) return 'nivel-medio';
    if (registros <= 20) return 'nivel-alto';
    return 'nivel-muy-alto';
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