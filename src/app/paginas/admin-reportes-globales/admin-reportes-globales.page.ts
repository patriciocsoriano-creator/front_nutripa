import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

interface PacienteMes {
  mes: string;
  nombreCorto: string;
  cantidad: number;
  porcentaje: number;
}

interface RegistroEstado {
  estado: string;
  total: number;
  porcentaje: number;
}

interface PlanPerfil {
  perfil_recomendado: string;
  total: number;
  porcentaje: number;
}

interface MedicoTop {
  nombre: string;
  total_pacientes: number;
  porcentaje: number;
}

@Component({
  selector: 'app-admin-reportes-globales',
  templateUrl: './admin-reportes-globales.page.html',
  styleUrls: ['./admin-reportes-globales.page.scss'],
  standalone: false,
})
export class AdminReportesGlobalesPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'reportes';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Estado
  cargando = false;

  // KPIs
  totalPacientesPeriodo = 0;
  totalRegistros = 0;
  totalPlanes = 0;

  // Datos de reportes
  pacientesPorMes: PacienteMes[] = [];
  registrosPorEstado: RegistroEstado[] = [];
  planesPorPerfil: PlanPerfil[] = [];
  topMedicos: MedicoTop[] = [];

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
    this.cargarReportes();
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

  async cargarReportes() {
    this.cargando = true;
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/reportes/globales`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        this.procesarDatos(response);
      } else {
        await this.showToast('Error al cargar reportes', 'danger');
      }
    } catch (error) {
      console.error('Error cargando reportes:', error);
      await this.showToast('Error al cargar reportes globales', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  private procesarDatos(data: any) {
    // Pacientes por mes
    this.procesarPacientesPorMes(data.pacientes_por_mes || []);

    // Registros por estado
    this.procesarRegistrosPorEstado(data.registros_por_estado || []);

    // Planes por perfil
    this.procesarPlanesPorPerfil(data.planes_por_perfil || []);

    // Top medicos
    this.procesarTopMedicos(data.top_medicos || []);

    // KPIs
    this.totalPacientesPeriodo = this.pacientesPorMes.reduce((sum, m) => sum + m.cantidad, 0);
    this.totalRegistros = this.registrosPorEstado.reduce((sum, r) => sum + r.total, 0);
    this.totalPlanes = this.planesPorPerfil.reduce((sum, p) => sum + p.total, 0);
  }

  private procesarPacientesPorMes(datos: any[]) {
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                         'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hoy = new Date();

    // Crear array de los ultimos 12 meses
    const meses: PacienteMes[] = [];
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      meses.push({
        mes: key,
        nombreCorto: nombresMeses[fecha.getMonth()],
        cantidad: 0,
        porcentaje: 0
      });
    }

    // Llenar con los datos del backend
    datos.forEach(d => {
      const mes = meses.find(m => m.mes === d.mes);
      if (mes) {
        mes.cantidad = d.total;
      }
    });

    // Calcular porcentajes
    const maxCantidad = Math.max(...meses.map(m => m.cantidad), 1);
    meses.forEach(m => {
      m.porcentaje = Math.round((m.cantidad / maxCantidad) * 100);
    });

    this.pacientesPorMes = meses;
  }

  private procesarRegistrosPorEstado(datos: any[]) {
    const total = datos.reduce((sum, d) => sum + d.total, 0);
    
    this.registrosPorEstado = datos.map(d => ({
      estado: d.estado || 'desconocido',
      total: d.total,
      porcentaje: total > 0 ? Math.round((d.total / total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  }

  private procesarPlanesPorPerfil(datos: any[]) {
    const total = datos.reduce((sum, d) => sum + d.total, 0);
    
    this.planesPorPerfil = datos.map(d => ({
      perfil_recomendado: d.perfil_recomendado || 'Sin perfil',
      total: d.total,
      porcentaje: total > 0 ? Math.round((d.total / total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  }

  private procesarTopMedicos(datos: any[]) {
    if (datos.length === 0) {
      this.topMedicos = [];
      return;
    }

    const maxPacientes = Math.max(...datos.map(d => d.total_pacientes), 1);
    
    this.topMedicos = datos.map(d => ({
      nombre: d.nombre,
      total_pacientes: d.total_pacientes,
      porcentaje: Math.round((d.total_pacientes / maxPacientes) * 100)
    }));
  }

  getNombreEstado(estado: string): string {
    const nombres: Record<string, string> = {
      'completado': 'Completado',
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'cancelado': 'Cancelado',
      'borrador': 'Borrador',
      'activo': 'Activo',
      'inactivo': 'Inactivo'
    };
    return nombres[estado] || estado;
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