import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertController, ToastController, LoadingController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-ver-pacientes',
  templateUrl: './admin-ver-pacientes.page.html',
  styleUrls: ['./admin-ver-pacientes.page.scss'],
  standalone: false,
})
export class AdminVerPacientesPage implements OnInit {
  // Sidebar
  sidebarOpen = false;
  submenuAbierto: string | null = 'pacientes';
  nombreAdmin: string = '';
  rol: string = 'Administrador';
  private isMobile = false;

  // Pacientes
  pacientes: any[] = [];
  pacientesFiltrados: any[] = [];
  cargando = false;
  terminoBusqueda = '';

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
    this.cargarPacientes();
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

  async cargarPacientes() {
    this.cargando = true;
    const token = localStorage.getItem('token');
    
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/pacientes`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();

      if (response?.error === false) {
        this.pacientes = response.pacientes || [];
        this.aplicarFiltros();
        console.log('Pacientes cargados:', this.pacientes.length);
      } else {
        await this.showToast('Error al cargar pacientes', 'danger');
      }
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      await this.showToast('Error al cargar pacientes', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  aplicarFiltros() {
    let filtrados = [...this.pacientes];
    
    if (this.terminoBusqueda) {
      const t = this.terminoBusqueda.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nombres?.toLowerCase().includes(t) ||
        p.apellidos?.toLowerCase().includes(t) ||
        p.numero_identificacion?.includes(t) ||
        p.telefono?.includes(t)
      );
    }

    this.pacientesFiltrados = filtrados;
  }

  calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  getSexoLabel(sexo: string): string {
    const labels: Record<string, string> = {
      'M': 'Masculino',
      'F': 'Femenino',
      'O': 'Otro'
    };
    return labels[sexo] || sexo;
  }

  async verDetalle(paciente: any) {
    const alert = await this.alertCtrl.create({
      header: `Detalle del Paciente`,
      message: `
        <strong>${paciente.nombres} ${paciente.apellidos}</strong><br><br>
        <strong>Cedula:</strong> ${paciente.numero_identificacion || 'No registrada'}<br>
        <strong>Telefono:</strong> ${paciente.telefono || 'No registrado'}<br>
        <strong>Sexo:</strong> ${this.getSexoLabel(paciente.sexo)}<br>
        <strong>Edad:</strong> ${this.calcularEdad(paciente.fecha_nacimiento)} anios<br>
        <strong>Fecha Nacimiento:</strong> ${paciente.fecha_nacimiento ? new Date(paciente.fecha_nacimiento).toLocaleDateString('es-EC') : 'No registrada'}<br>
        <strong>Registros clinicos:</strong> ${paciente.total_registros || 0}<br>
        <strong>Registrado:</strong> ${paciente.creado_en ? new Date(paciente.creado_en).toLocaleDateString('es-EC') : 'No disponible'}
      `,
      buttons: ['Cerrar']
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