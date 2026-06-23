import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

interface RangoEdad {
  label: string;
  min: number;
  max: number;
  cantidad: number;
  porcentaje: number;
  clase: string;
}

interface PacienteMes {
  mes: string;
  nombreCorto: string;
  cantidad: number;
  porcentaje: number;
}

@Component({
  selector: 'app-admin-estadisticas-pacientes',
  templateUrl: './admin-estadisticas-pacientes.page.html',
  styleUrls: ['./admin-estadisticas-pacientes.page.scss'],
  standalone: false,
})
export class AdminEstadisticasPacientesPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'pacientes';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Estado
  cargando = false;
  pacientes: any[] = [];

  // KPIs
  totalPacientes = 0;
  totalActivos = 0;
  totalRegistros = 0;
  promedioRegistros = 0;

  // Distribucion por sexo
  totalMasculinos = 0;
  totalFemeninos = 0;
  totalOtro = 0;
  porcentajeMasculinos = 0;
  porcentajeFemeninos = 0;
  porcentajeOtro = 0;

  // Distribucion por edad
  rangosEdad: RangoEdad[] = [];
  edadPromedio = 0;

  // Pacientes por mes
  pacientesPorMes: PacienteMes[] = [];

  // Top pacientes
  topPacientes: any[] = [];

  // Resumen
  pacientesConRegistros = 0;
  pacientesSinRegistros = 0;
  nuevosEsteMes = 0;
  nuevosEstaSemana = 0;

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
    this.cargarDatos();
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

  async cargarDatos() {
    this.cargando = true;
    const token = localStorage.getItem('token');

    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/pacientes`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        this.pacientes = response.pacientes || [];
        this.calcularEstadisticas();
      } else {
        await this.showToast('Error al cargar datos', 'danger');
      }
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      await this.showToast('Error al cargar estadisticas', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  private calcularEstadisticas() {
    // KPIs
    this.totalPacientes = this.pacientes.length;
    this.totalActivos = this.pacientes.filter(p => p.activo !== 0).length;
    this.totalRegistros = this.pacientes.reduce((sum, p) => sum + (p.total_registros || 0), 0);
    this.promedioRegistros = this.totalPacientes > 0 
      ? Math.round((this.totalRegistros / this.totalPacientes) * 10) / 10 
      : 0;

    // Distribucion por sexo
    this.totalMasculinos = this.pacientes.filter(p => p.sexo === 'M').length;
    this.totalFemeninos = this.pacientes.filter(p => p.sexo === 'F').length;
    this.totalOtro = this.pacientes.filter(p => p.sexo === 'O' || !p.sexo).length;

    if (this.totalPacientes > 0) {
      this.porcentajeMasculinos = Math.round((this.totalMasculinos / this.totalPacientes) * 100);
      this.porcentajeFemeninos = Math.round((this.totalFemeninos / this.totalPacientes) * 100);
      this.porcentajeOtro = Math.round((this.totalOtro / this.totalPacientes) * 100);
    }

    // Distribucion por edad
    this.calcularRangosEdad();

    // Pacientes por mes
    this.calcularPacientesPorMes();

    // Top pacientes
    this.topPacientes = [...this.pacientes]
      .filter(p => p.total_registros > 0)
      .sort((a, b) => (b.total_registros || 0) - (a.total_registros || 0))
      .slice(0, 5);

    // Resumen
    this.pacientesConRegistros = this.pacientes.filter(p => p.total_registros > 0).length;
    this.pacientesSinRegistros = this.totalPacientes - this.pacientesConRegistros;
    this.calcularNuevos();
  }

  private calcularRangosEdad() {
    const rangos = [
      { label: '0-17 anios', min: 0, max: 17, clase: 'edad-1' },
      { label: '18-30 anios', min: 18, max: 30, clase: 'edad-2' },
      { label: '31-45 anios', min: 31, max: 45, clase: 'edad-3' },
      { label: '46-60 anios', min: 46, max: 60, clase: 'edad-4' },
      { label: '61+ anios', min: 61, max: 200, clase: 'edad-5' }
    ];

    const edades: number[] = [];
    const conteo = rangos.map(r => ({ ...r, cantidad: 0, porcentaje: 0 }));

    this.pacientes.forEach(p => {
      const edad = this.calcularEdad(p.fecha_nacimiento);
      if (edad > 0) {
        edades.push(edad);
        const rango = conteo.find(r => edad >= r.min && edad <= r.max);
        if (rango) rango.cantidad++;
      }
    });

    // Calcular porcentajes
    const maxCantidad = Math.max(...conteo.map(r => r.cantidad), 1);
    conteo.forEach(r => {
      r.porcentaje = this.totalPacientes > 0 
        ? Math.round((r.cantidad / this.totalPacientes) * 100)
        : 0;
    });

    this.rangosEdad = conteo;
    this.edadPromedio = edades.length > 0
      ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length)
      : 0;
  }

  private calcularPacientesPorMes() {
    const hoy = new Date();
    const meses: PacienteMes[] = [];
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                         'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Crear array de los ultimos 12 meses
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

    // Contar pacientes por mes
    this.pacientes.forEach(p => {
      if (p.creado_en) {
        const fecha = new Date(p.creado_en);
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        const mes = meses.find(m => m.mes === key);
        if (mes) mes.cantidad++;
      }
    });

    // Calcular porcentajes (relativo al maximo)
    const maxCantidad = Math.max(...meses.map(m => m.cantidad), 1);
    meses.forEach(m => {
      m.porcentaje = Math.round((m.cantidad / maxCantidad) * 100);
    });

    this.pacientesPorMes = meses;
  }

  private calcularNuevos() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0);

    this.nuevosEsteMes = this.pacientes.filter(p => {
      if (!p.creado_en) return false;
      return new Date(p.creado_en) >= inicioMes;
    }).length;

    this.nuevosEstaSemana = this.pacientes.filter(p => {
      if (!p.creado_en) return false;
      return new Date(p.creado_en) >= inicioSemana;
    }).length;
  }

  private calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad > 0 ? edad : 0;
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